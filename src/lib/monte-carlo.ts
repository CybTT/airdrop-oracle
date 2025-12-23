// Monte Carlo Simulation Engine for NFT Airdrop Valuation
// Core formula: value_per_nft = (FDV × drop_percentage) / nft_supply

export interface SimulationParams {
  nftSupply: number;
  
  // FDV Distribution (mixture of two log-uniform ranges)
  fdvMinA: number;
  fdvMaxA: number;
  fdvProbA: number; // p_A, probability of Range A
  fdvMinB: number;
  fdvMaxB: number;
  // p_B = 1 - p_A
  
  // Drop Percentage Distribution (mixture of triangular + uniform)
  dropMin: number;    // Main triangular: min
  dropMode: number;   // Main triangular: mode
  dropMax: number;    // Main triangular: max
  dropTailMin: number;  // Tail uniform: min
  dropTailMax: number;  // Tail uniform: max
  dropTailProb: number; // p_tail, probability of tail range
  
  // Simulation settings
  numSimulations: number;
  seed?: number;
}

export interface SimulationResults {
  values: Float64Array;
  stats: SimulationStats;
  histogram: HistogramBin[];
  thresholdProbs: Record<number, number>;
  worstCase: number;
  bestCase: number;
  executionTimeMs: number;
}

export interface SimulationStats {
  mean: number;
  median: number;
  p5: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  density: number;
}

// Seeded PRNG (xorshift128+)
class SeededRandom {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    this.s0 = seed >>> 0;
    this.s1 = (seed * 1812433253 + 1) >>> 0;
    // Warm up
    for (let i = 0; i < 20; i++) this.next();
  }

  next(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.s1 = s1;
    return (this.s0 >>> 0) / 4294967296;
  }
}

// Log-uniform distribution sampler
// Returns value in [min, max] with log-uniform distribution
function sampleLogUniform(min: number, max: number, u: number): number {
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  return Math.exp(logMin + u * (logMax - logMin));
}

// Triangular distribution sampler
// Returns value in [min, max] with mode as peak
function sampleTriangular(min: number, mode: number, max: number, u: number): number {
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

// Uniform distribution sampler
function sampleUniform(min: number, max: number, u: number): number {
  return min + u * (max - min);
}

// Sample FDV from mixture distribution
function sampleFDV(params: SimulationParams, rng: SeededRandom): number {
  const u1 = rng.next();
  const u2 = rng.next();
  
  if (u1 < params.fdvProbA) {
    // Sample from Range A (log-uniform)
    return sampleLogUniform(params.fdvMinA, params.fdvMaxA, u2);
  } else {
    // Sample from Range B (log-uniform)
    return sampleLogUniform(params.fdvMinB, params.fdvMaxB, u2);
  }
}

// Sample Drop Percentage from mixture distribution
function sampleDropPercentage(params: SimulationParams, rng: SeededRandom): number {
  const u1 = rng.next();
  const u2 = rng.next();
  
  if (u1 < params.dropTailProb) {
    // Sample from tail (uniform)
    return sampleUniform(params.dropTailMin, params.dropTailMax, u2);
  } else {
    // Sample from main range (triangular)
    return sampleTriangular(params.dropMin, params.dropMode, params.dropMax, u2);
  }
}

// Compute percentile from sorted array
function percentile(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  const rank = (p / 100) * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  
  if (upper >= n) return sorted[n - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Compute standard deviation
function computeStdDev(values: Float64Array, mean: number): number {
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - mean;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / values.length);
}

// Create histogram bins (log-scale aware)
function createHistogram(values: Float64Array, numBins: number = 50): HistogramBin[] {
  const sorted = new Float64Array(values).sort();
  const minVal = Math.max(sorted[0], 0.01);
  const maxVal = sorted[sorted.length - 1];
  
  // Use log-scale bins for better visualization
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const binWidth = (logMax - logMin) / numBins;
  
  const bins: HistogramBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const binStart = Math.pow(10, logMin + i * binWidth);
    const binEnd = Math.pow(10, logMin + (i + 1) * binWidth);
    bins.push({
      binStart,
      binEnd,
      count: 0,
      density: 0
    });
  }
  
  // Count values in each bin
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val < minVal) continue;
    const logVal = Math.log10(val);
    const binIndex = Math.min(
      Math.floor((logVal - logMin) / binWidth),
      numBins - 1
    );
    bins[binIndex].count++;
  }
  
  // Compute density
  const total = values.length;
  for (const bin of bins) {
    bin.density = bin.count / total;
  }
  
  return bins;
}

// Calculate probability above thresholds
function calcThresholdProbs(sorted: Float64Array, thresholds: number[]): Record<number, number> {
  const result: Record<number, number> = {};
  const n = sorted.length;
  
  for (const threshold of thresholds) {
    // Binary search for first value >= threshold
    let left = 0;
    let right = n;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (sorted[mid] < threshold) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    result[threshold] = (n - left) / n;
  }
  
  return result;
}

// Main simulation function
export function runSimulation(
  params: SimulationParams,
  thresholds: number[] = [60, 120, 300]
): SimulationResults {
  const startTime = performance.now();
  
  // Initialize RNG
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);
  
  // Allocate results array
  const values = new Float64Array(params.numSimulations);
  
  // Run simulation
  for (let i = 0; i < params.numSimulations; i++) {
    const fdv = sampleFDV(params, rng);
    const dropPct = sampleDropPercentage(params, rng);
    
    // Core formula: value_per_nft = (FDV × drop_percentage) / nft_supply
    values[i] = (fdv * dropPct) / params.nftSupply;
  }
  
  // Sort for percentile calculations
  const sorted = new Float64Array(values).sort();
  
  // Compute statistics
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
  }
  const mean = sum / values.length;
  
  const stats: SimulationStats = {
    mean,
    median: percentile(sorted, 50),
    p5: percentile(sorted, 5),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: computeStdDev(values, mean)
  };
  
  // Create histogram
  const histogram = createHistogram(values);
  
  // Calculate threshold probabilities
  const thresholdProbs = calcThresholdProbs(sorted, thresholds);
  
  // Anchor cases
  const worstCase = (params.fdvMinA * params.dropMin) / params.nftSupply;
  const bestCase = (Math.max(params.fdvMaxA, params.fdvMaxB) * Math.max(params.dropMax, params.dropTailMax)) / params.nftSupply;
  
  const executionTimeMs = performance.now() - startTime;
  
  return {
    values,
    stats,
    histogram,
    thresholdProbs,
    worstCase,
    bestCase,
    executionTimeMs
  };
}

// Preset configurations
export interface Preset {
  name: string;
  params: Omit<SimulationParams, 'numSimulations' | 'seed'>;
}

export const PRESETS: Record<string, Preset> = {
  conservative: {
    name: 'Conservative',
    params: {
      nftSupply: 8888,
      fdvMinA: 50_000_000,
      fdvMaxA: 150_000_000,
      fdvProbA: 0.85,
      fdvMinB: 150_000_000,
      fdvMaxB: 300_000_000,
      dropMin: 0.005,
      dropMode: 0.01,
      dropMax: 0.02,
      dropTailMin: 0.02,
      dropTailMax: 0.03,
      dropTailProb: 0.1
    }
  },
  base: {
    name: 'Base',
    params: {
      nftSupply: 8888,
      fdvMinA: 100_000_000,
      fdvMaxA: 500_000_000,
      fdvProbA: 0.75,
      fdvMinB: 500_000_000,
      fdvMaxB: 1_000_000_000,
      dropMin: 0.01,
      dropMode: 0.02,
      dropMax: 0.04,
      dropTailMin: 0.04,
      dropTailMax: 0.06,
      dropTailProb: 0.15
    }
  },
  optimistic: {
    name: 'Optimistic',
    params: {
      nftSupply: 8888,
      fdvMinA: 300_000_000,
      fdvMaxA: 1_000_000_000,
      fdvProbA: 0.65,
      fdvMinB: 1_000_000_000,
      fdvMaxB: 3_000_000_000,
      dropMin: 0.02,
      dropMode: 0.04,
      dropMax: 0.06,
      dropTailMin: 0.06,
      dropTailMax: 0.10,
      dropTailProb: 0.2
    }
  }
};

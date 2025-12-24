// Simple Monte Carlo Engine with Fixed 3-Part FDV Mixture Distribution
// No sliders, no user-configurable distributions - all auto-determined

export interface SimpleSimulationParams {
  nftSupply: number;
  fdvMinM: number;  // FDV min in MILLIONS
  fdvMaxM: number;  // FDV max in MILLIONS
  dropMinPct: number;  // Drop% min as percentage (e.g., 5 = 5%)
  dropMaxPct: number;  // Drop% max as percentage (e.g., 50 = 50%)
  numSimulations: number;
  seed?: number;
}

export interface SimpleSimulationResults {
  stats: SimpleStats;
  histogram: HistogramBin[];
  thresholdProbs: Record<number, number>;
  worstCase: number;
  bestCase: number;
  executionTimeMs: number;
}

export interface SimpleStats {
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
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  density: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Validate inputs
export function validateParams(params: SimpleSimulationParams): ValidationError[] {
  const errors: ValidationError[] = [];

  if (params.nftSupply <= 0) {
    errors.push({ field: 'nftSupply', message: 'NFT supply must be greater than 0' });
  }

  if (params.fdvMinM <= 0) {
    errors.push({ field: 'fdvMinM', message: 'FDV Min must be greater than 0' });
  }

  if (params.fdvMaxM <= 0) {
    errors.push({ field: 'fdvMaxM', message: 'FDV Max must be greater than 0' });
  }

  if (params.fdvMaxM <= params.fdvMinM) {
    errors.push({ field: 'fdvMaxM', message: 'FDV Max must be greater than FDV Min' });
  }

  if (params.dropMinPct <= 0 || params.dropMinPct >= 100) {
    errors.push({ field: 'dropMinPct', message: 'Drop% Min must be between 0 and 100' });
  }

  if (params.dropMaxPct <= 0 || params.dropMaxPct >= 100) {
    errors.push({ field: 'dropMaxPct', message: 'Drop% Max must be between 0 and 100' });
  }

  if (params.dropMaxPct <= params.dropMinPct) {
    errors.push({ field: 'dropMaxPct', message: 'Drop% Max must be greater than Drop% Min' });
  }

  if (params.numSimulations < 1000) {
    errors.push({ field: 'numSimulations', message: 'Simulations must be at least 1,000' });
  }

  return errors;
}

// Fast PRNG (xorshift128+)
class SeededRandom {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    this.s0 = seed >>> 0;
    this.s1 = (seed * 1812433253 + 1) >>> 0;
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

// FDV Mixture Distribution Zones
interface FDVZone {
  min: number;
  max: number;
  weight: number;
  type: 'uniform' | 'linearDecreasing';
}

interface FDVZones {
  zones: FDVZone[];
  cumulativeWeights: number[];
}

// Calculate FDV zones based on user inputs
// Fixed 3-part mixture:
// A) High probability zone: [fdvMin, fdvMin+30M] - Uniform, weight 0.75
// B) Declining zone: (end of A, fdvMax or 200M] - Linear decreasing, weight 0.24
// C) Ultra-rare tail: (200M, min(fdvMax, 300M)] - Uniform, weight 0.01 (only if fdvMax >= 200M)
function calculateFDVZones(fdvMinM: number, fdvMaxM: number): FDVZones {
  const fdvMin = fdvMinM * 1_000_000;
  const fdvMax = fdvMaxM * 1_000_000;
  
  // Zone boundaries
  const zoneABandwidth = 30_000_000; // 30M high-probability band
  const tailThreshold = 200_000_000; // 200M threshold for tail
  const tailCap = 300_000_000; // 300M cap for tail
  
  // Base weights
  const baseWA = 0.75;
  const baseWB = 0.24;
  const baseWC = 0.01;
  
  const zones: FDVZone[] = [];
  
  // Zone A: [fdvMin, min(fdvMin + 30M, fdvMax)] - Uniform
  const zoneAMax = Math.min(fdvMin + zoneABandwidth, fdvMax);
  if (zoneAMax > fdvMin) {
    zones.push({ min: fdvMin, max: zoneAMax, weight: baseWA, type: 'uniform' });
  }
  
  // Zone B: (end of A, fdvMax] but capped at 200M if tail exists - Linear decreasing
  const zoneBMin = zoneAMax;
  const zoneBMax = fdvMax >= tailThreshold ? Math.min(fdvMax, tailThreshold) : fdvMax;
  if (zoneBMax > zoneBMin) {
    zones.push({ min: zoneBMin, max: zoneBMax, weight: baseWB, type: 'linearDecreasing' });
  }
  
  // Zone C: (200M, min(fdvMax, 300M)] - Uniform, only if fdvMax > 200M
  if (fdvMax > tailThreshold) {
    const zoneCMax = Math.min(fdvMax, tailCap);
    zones.push({ min: tailThreshold, max: zoneCMax, weight: baseWC, type: 'uniform' });
  }
  
  // Re-normalize weights if any zone is missing
  const totalWeight = zones.reduce((sum, z) => sum + z.weight, 0);
  if (totalWeight > 0 && Math.abs(totalWeight - 1) > 0.001) {
    zones.forEach(z => {
      z.weight = z.weight / totalWeight;
    });
  }
  
  // Pre-compute cumulative weights for fast sampling
  const cumulativeWeights: number[] = [];
  let cumulative = 0;
  for (const zone of zones) {
    cumulative += zone.weight;
    cumulativeWeights.push(cumulative);
  }
  
  return { zones, cumulativeWeights };
}

// Sample from linear decreasing density on [a, b]
// PDF proportional to (b - x), so higher density near a (lower FDVs)
// Inverse CDF: x = b - sqrt((b-a)^2 * (1-u))
function sampleLinearDecreasing(min: number, max: number, u: number): number {
  const range = max - min;
  return max - Math.sqrt(range * range * (1 - u));
}

// Sample FDV from 3-part mixture distribution
function sampleFDVMixture(fdvZones: FDVZones, u1: number, u2: number): number {
  const { zones, cumulativeWeights } = fdvZones;
  
  // Find which zone u1 falls into
  let zoneIndex = 0;
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (u1 <= cumulativeWeights[i]) {
      zoneIndex = i;
      break;
    }
  }
  
  const zone = zones[zoneIndex];
  
  // Sample within selected zone using u2
  if (zone.type === 'uniform') {
    return zone.min + u2 * (zone.max - zone.min);
  } else {
    // Linear decreasing density
    return sampleLinearDecreasing(zone.min, zone.max, u2);
  }
}

// Triangular with auto mode: mode = min + 0.20 * (max - min)
function sampleTriangularAutoMode(min: number, max: number, u: number): number {
  const mode = min + 0.20 * (max - min);
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

// Percentile from sorted array
function percentile(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  const rank = (p / 100) * (n - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  if (upper >= n) return sorted[n - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Histogram with log-scale bins
function createHistogram(values: Float64Array, numBins: number = 40): HistogramBin[] {
  const sorted = new Float64Array(values).sort();
  const minVal = Math.max(sorted[0], 0.01);
  const maxVal = sorted[sorted.length - 1];
  
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  const binWidth = (logMax - logMin) / numBins;
  
  const bins: HistogramBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const binStart = Math.pow(10, logMin + i * binWidth);
    const binEnd = Math.pow(10, logMin + (i + 1) * binWidth);
    bins.push({ binStart, binEnd, count: 0, density: 0 });
  }
  
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val < minVal) continue;
    const logVal = Math.log10(val);
    const binIndex = Math.min(Math.floor((logVal - logMin) / binWidth), numBins - 1);
    bins[binIndex].count++;
  }
  
  const total = values.length;
  for (const bin of bins) {
    bin.density = bin.count / total;
  }
  
  return bins;
}

// Binary search for threshold probabilities
function calcThresholdProbs(sorted: Float64Array, thresholds: number[]): Record<number, number> {
  const result: Record<number, number> = {};
  const n = sorted.length;
  
  for (const threshold of thresholds) {
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

// Main simulation
export function runSimpleSimulation(
  params: SimpleSimulationParams,
  thresholds: number[] = [60, 120, 300]
): SimpleSimulationResults {
  const startTime = performance.now();
  
  // Convert inputs
  const dropMin = params.dropMinPct / 100;     // Convert % to decimal
  const dropMax = params.dropMaxPct / 100;
  
  // Calculate FDV zones based on user's min/max
  const fdvZones = calculateFDVZones(params.fdvMinM, params.fdvMaxM);
  
  // Initialize RNG
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);
  
  // Allocate
  const values = new Float64Array(params.numSimulations);
  
  // Run simulation
  for (let i = 0; i < params.numSimulations; i++) {
    const u1 = rng.next(); // For zone selection
    const u2 = rng.next(); // For within-zone sampling
    const u3 = rng.next(); // For drop%
    
    // FDV: 3-part mixture distribution
    const fdv = sampleFDVMixture(fdvZones, u1, u2);
    
    // Drop%: triangular with mode biased low (20% into range)
    const dropPct = sampleTriangularAutoMode(dropMin, dropMax, u3);
    
    // Core formula
    values[i] = (fdv * dropPct) / params.nftSupply;
  }
  
  // Sort for statistics
  const sorted = new Float64Array(values).sort();
  
  // Stats
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  const mean = sum / values.length;
  
  const stats: SimpleStats = {
    mean,
    median: percentile(sorted, 50),
    p5: percentile(sorted, 5),
    p10: percentile(sorted, 10),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
  
  // Histogram
  const histogram = createHistogram(values);
  
  // Thresholds
  const thresholdProbs = calcThresholdProbs(sorted, thresholds);
  
  // Anchors (use actual user min/max in dollars)
  const fdvMin = params.fdvMinM * 1_000_000;
  const fdvMax = params.fdvMaxM * 1_000_000;
  const worstCase = (fdvMin * dropMin) / params.nftSupply;
  const bestCase = (fdvMax * dropMax) / params.nftSupply;
  
  const executionTimeMs = performance.now() - startTime;
  
  return {
    stats,
    histogram,
    thresholdProbs,
    worstCase,
    bestCase,
    executionTimeMs
  };
}

// Default params
export const DEFAULT_PARAMS: SimpleSimulationParams = {
  nftSupply: 8888,
  fdvMinM: 20,       // 20M
  fdvMaxM: 200,      // 200M
  dropMinPct: 5,     // 5%
  dropMaxPct: 50,    // 50%
  numSimulations: 200000
};
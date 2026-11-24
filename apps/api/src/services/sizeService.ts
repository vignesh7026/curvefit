import { createHash, randomBytes } from "node:crypto";
import {
  type SizeChart,
  type SizeRecommendation,
  type SizeRequest,
  recommendSize,
  sampleCharts,
} from "@curvefit/shared";
import { SizeChartModel } from "../models/SizeChart";
import { SizeFinderLogModel } from "../models/SizeFinderLog";
import { notFound } from "../utils/httpError";

export interface SizeAnswer extends SizeRecommendation {
  chart: SizeChart;
  /** Present only when the customer consented to storage; lets them delete the record. */
  deleteToken?: string;
}

export interface SizeService {
  getChart(productId: string): Promise<SizeChart>;
  upsertChart(chart: SizeChart): Promise<void>;
  recommend(req: SizeRequest): Promise<SizeAnswer>;
  deleteLog(token: string): Promise<void>;
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export function createSizeService(): SizeService {
  async function getChart(productId: string): Promise<SizeChart> {
    const doc = await SizeChartModel.findOne({ productId }).lean();
    if (doc) {
      return {
        productId: doc.productId,
        category: doc.category,
        stretchNote: doc.stretchNote,
        bands: doc.bands as SizeChart["bands"],
      };
    }
    const sample = sampleCharts.find((c) => c.productId === productId);
    if (!sample) throw notFound("No size chart for this product");
    return sample;
  }

  return {
    getChart,

    async upsertChart(chart) {
      await SizeChartModel.findOneAndUpdate({ productId: chart.productId }, chart, {
        upsert: true,
        runValidators: true,
      });
    },

    async recommend(req) {
      const chart = await getChart(req.productId);
      const result = recommendSize(chart, req.measurements);
      // Body measurements are personal data: store only with explicit consent.
      if (!req.consentToStore) return { ...result, chart };
      const deleteToken = randomBytes(24).toString("hex");
      await SizeFinderLogModel.create({
        productId: req.productId,
        inputs: req.measurements,
        recommendedSize: result.size,
        alternateSize: result.alternateSize,
        consent: true,
        deleteTokenHash: sha(deleteToken),
      });
      return { ...result, chart, deleteToken };
    },

    async deleteLog(token) {
      await SizeFinderLogModel.deleteMany({ deleteTokenHash: sha(token) });
    },
  };
}

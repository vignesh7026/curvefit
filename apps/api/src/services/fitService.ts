import {
  type ChartSuggestion,
  type FitSessionEntry,
  type FitSessionInput,
  type SizeChart,
  buildDraftChart,
  suggestChart,
} from "@curvefit/shared";
import { FitSessionModel } from "../models/FitSession";
import { notFound } from "../utils/httpError";
import type { SizeService } from "./sizeService";

export interface FitDraft {
  sessionCount: number;
  suggestion: ChartSuggestion;
  /** The current chart with suggested ranges applied; a person reviews it before saving. */
  draftChart: SizeChart;
}

export interface FitService {
  create(input: FitSessionInput): Promise<{ id: string }>;
  list(productId: string): Promise<unknown[]>;
  remove(id: string): Promise<void>;
  suggest(productId: string): Promise<FitDraft>;
}

export function createFitService(size: SizeService): FitService {
  return {
    async create(input) {
      const doc = await FitSessionModel.create(input);
      return { id: String(doc._id) };
    },
    async list(productId) {
      return FitSessionModel.find({ productId }).sort({ createdAt: -1 }).limit(500).lean();
    },
    async remove(id) {
      const doc = await FitSessionModel.findByIdAndDelete(id);
      if (!doc) throw notFound("Entry not found");
    },
    async suggest(productId) {
      const chart = await size.getChart(productId);
      const rows = await FitSessionModel.find({ productId }).lean();
      const entries: FitSessionEntry[] = rows.map((r) => ({
        productId: r.productId,
        sizeTried: r.sizeTried,
        heightCm: r.heightCm,
        bustCm: r.bustCm,
        waistCm: r.waistCm,
        hipCm: r.hipCm,
        fit: r.fit,
        opacityOk: r.opacityOk,
      }));
      const suggestion = suggestChart(
        entries,
        chart.bands.map((b) => b.label),
      );
      return {
        sessionCount: entries.length,
        suggestion,
        draftChart: buildDraftChart(chart, suggestion),
      };
    },
  };
}

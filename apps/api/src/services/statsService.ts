import { ExchangeRequestModel } from "../models/ExchangeRequest";
import { ReviewModel } from "../models/Review";
import { SizeFinderLogModel } from "../models/SizeFinderLog";
import { WaitlistModel } from "../models/Waitlist";

export interface Stats {
  exchanges: {
    total: number;
    byStatus: Record<string, number>;
    byKind: Record<string, number>;
    /** Exchange requests by whether the customer used the size finder. */
    withSizeFinder: number;
    withoutSizeFinder: number;
  };
  reviewsPending: number;
  savedSizeRecords: number;
  waitlist: { total: number; referred: number };
}

const toMap = (rows: Array<{ _id: string | boolean; n: number }>) =>
  Object.fromEntries(rows.map((r) => [String(r._id), r.n]));

export interface StatsService {
  get(): Promise<Stats>;
}

export function createStatsService(): StatsService {
  return {
    async get() {
      const group = (field: string) => [{ $group: { _id: `$${field}`, n: { $sum: 1 } } }];
      const [byStatus, byKind, byQuiz, reviewsPending, savedSizeRecords, total, referred] =
        await Promise.all([
          ExchangeRequestModel.aggregate(group("status")),
          ExchangeRequestModel.aggregate(group("kind")),
          ExchangeRequestModel.aggregate(group("sizeFinderUsed")),
          ReviewModel.countDocuments({ status: "pending" }),
          SizeFinderLogModel.countDocuments(),
          WaitlistModel.countDocuments(),
          WaitlistModel.countDocuments({ referredBy: { $ne: null } }),
        ]);
      const quiz = toMap(byQuiz);
      const statusMap = toMap(byStatus);
      return {
        exchanges: {
          total: Object.values(statusMap).reduce((a, b) => a + b, 0),
          byStatus: statusMap,
          byKind: toMap(byKind),
          withSizeFinder: quiz["true"] ?? 0,
          withoutSizeFinder: quiz["false"] ?? 0,
        },
        reviewsPending,
        savedSizeRecords,
        waitlist: { total, referred },
      };
    },
  };
}

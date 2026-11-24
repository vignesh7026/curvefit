/**
 * Seeds the database.
 *   npm run seed -w @curvefit/api                  size charts only
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed -w @curvefit/api   + staff user
 *   add --demo for sample approved reviews (development only)
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { sampleCharts } from "@curvefit/shared";
import { AdminUserModel } from "../src/models/AdminUser";
import { ReviewModel } from "../src/models/Review";
import { SizeChartModel } from "../src/models/SizeChart";

async function main() {
  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/curvefit";
  await mongoose.connect(uri);

  for (const chart of sampleCharts) {
    await SizeChartModel.findOneAndUpdate({ productId: chart.productId }, chart, { upsert: true });
  }
  console.warn(`size charts: ${sampleCharts.length} upserted`);

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
    const role = process.env.SEED_ADMIN_ROLE === "support" ? "support" : "admin";
    await AdminUserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        name: process.env.SEED_ADMIN_NAME ?? "Admin",
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role,
      },
      { upsert: true },
    );
    console.warn(`staff user ${email} (${role}) upserted`);
  }

  if (process.argv.includes("--demo")) {
    if (process.env.NODE_ENV === "production") throw new Error("--demo is for development only");
    await ReviewModel.deleteMany({ body: /^\[demo\]/ });
    const base = { productId: "high-rise-squat-proof-legging", status: "approved" };
    await ReviewModel.insertMany([
      {
        ...base,
        rating: 5,
        sizeWorn: "3XL",
        heightCm: 165,
        hipCm: 127,
        fit: "true_to_size",
        body: "[demo] Stays up through squats.",
      },
      {
        ...base,
        rating: 4,
        sizeWorn: "2XL",
        heightCm: 160,
        hipCm: 118,
        fit: "runs_small",
        body: "[demo] Great, but I sized up.",
      },
      {
        ...base,
        rating: 5,
        sizeWorn: "5XL",
        heightCm: 172,
        hipCm: 143,
        fit: "true_to_size",
        body: "[demo] Finally a waistband that does not roll.",
      },
    ]);
    console.warn("demo reviews inserted");
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

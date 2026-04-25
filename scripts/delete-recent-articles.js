import("dotenv")
  .then(() => import("@headlines/data-access/dbConnect.js"))
  .then(async () => {
    const { Article } = await import("@headlines/models");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const toDelete = await Article.countDocuments({
      createdAt: { $gte: cutoff },
    });

    console.log("Articles to delete (last 24h):", toDelete);

    if (toDelete > 0) {
      const result = await Article.deleteMany({
        createdAt: { $gte: cutoff },
      });
      console.log("Deleted:", result.deletedCount);
    }

    console.log("Done!");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error:", e.message, e.stack);
    process.exit(1);
  });

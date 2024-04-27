require("dotenv").config();
const openai = require("./openai.js");
const express = require("express");
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: "Too many requests, please try again later.",
});

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use("/categorise/", apiLimiter);
app.set("trust proxy", 1);

app.get("/categorise/:category/", async (req, res) => {
  try {
    // console.log(req.params.category);
    const { lotTitle, auctionTitle="" } = req.query;
    const truncatedLotTitle =
      lotTitle.length > process.env.MAXIMUM_INPUT_LENGTH
        ? lotTitle.slice(0, process.env.MAXIMUM_INPUT_LENGTH)
        : lotTitle;
    const truncatedAuctionTitle =
      auctionTitle.length > process.env.MAXIMUM_INPUT_LENGTH
        ? auctionTitle.slice(0, process.env.MAXIMUM_INPUT_LENGTH)
        : auctionTitle;

    const category = req.params.category;

    // Check for valid categories. This can be expanded as needed.
    if (!["industrial-seo", "industrial-meganav", "art", "commercial", "industrial-autocat", "alibabaCategories", "LiveAuctioneersCategories"].includes(category)) {
      return res.status(400).send("Invalid category.");
    }

    try {
      const answer = await openai.runConversation(
        truncatedLotTitle,
        truncatedAuctionTitle,
        category
      );
      res.send(answer);
    } catch (conversationError) {
      console.error(conversationError);
      // Send a specific message about the conversation error.
      res
        .status(500)
        .send("An error occurred while processing the conversation.");
    }
  } catch (error) {
    console.error(error);
    // This will catch other generic errors in your code
    res.status(500).send(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

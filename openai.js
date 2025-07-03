const OpenAIApi = require("openai").default; // Accessing the default export
const openai = new OpenAIApi();

const {
  industryCategoriesSEO,
  industryCategoriesMeganav,
  industryCategoriesautocat,
  artCategories,
  commercialCategories,
  alibabaCategories,
  LiveAuctioneersCategories,
} = require("./categories.js");

async function runConversation(lotTitle, auctionTitle = null, taxonomy = "industrial-meganav") {
  // Ensure model is set
  if (!process.env.MODEL) {
    throw new Error("Environment variable MODEL is not set.");
  }

  let selectedCategories, competitor;

  switch (taxonomy) {
    case "art":
      selectedCategories = artCategories;
      competitor = "Sotheby's, Christie's or Bonhams";
      break;
    case "industrial-seo":
      selectedCategories = industryCategoriesSEO;
      competitor = "Home Depot, Grainger or Alibaba";
      break;
    case "industrial-meganav":
      selectedCategories = industryCategoriesMeganav;
      competitor = "Home Depot, Grainger or Alibaba";
      break;
    case "industrial-autocat":
      selectedCategories = industryCategoriesautocat;
      competitor = "Home Depot, Grainger or Alibaba";
      break;
    case "commercial":
      selectedCategories = commercialCategories;
      competitor = "eBay, Amazon, Walmart";
      break;
    case "alibabaCategories":
      selectedCategories = alibabaCategories;
      competitor = "Alibaba";
      break;
    case "LiveAuctioneersCategories":
      selectedCategories = LiveAuctioneersCategories;
      competitor = "Sotheby's, Christie's or Bonhams";
      break;
    default:
      throw new Error(`Unknown taxonomy: ${taxonomy}`);
  }

  const messages = [
    {
      role: "user",
      content: `Update metadata for this product: "${lotTitle}". ${
        auctionTitle ? `This product was purchased in an auction titled "${auctionTitle}"` : ""
      }`,
    },
  ];

  const primaryCategoriesAndDescs = Object.keys(selectedCategories).map((key) =>
    selectedCategories[key].description
      ? `${key}: ${selectedCategories[key].description}`
      : key
  );

  const functions = [
    {
      name: "update_metadata",
      description: `Save metadata about a product for use on the ${competitor} website`,
      parameters: {
        type: "object",
        properties: {
          primaryCategory: {
            type: "string",
            description: "Category. Must be one of the options provided.",
            enum: primaryCategoriesAndDescs,
          },
          Maker: {
            type: "string",
            description:
              "The maker, artist, brand or manufacturer of this product. Do not use ALL CAPS. Prefer 'Lastname, Firstname' for people. Or Unknown.",
          },
          objectType: {
            type: "string",
            description:
              "One or two dictionary words describing the item type or object type, in your own words. English language only.",
          },
        },
        required: ["primaryCategory", "partOrAccessory", "Maker", "objectType"],
      },
    },
  ];

  let response;
  try {
    response = await openai.chat.completions.create({
      model: process.env.MODEL,
      messages,
      functions,
      function_call: { name: "update_metadata" },
      temperature: process.env.temperature,
    });
  } catch (err) {
    console.error("OpenAI request (primary category) failed:", err);
    throw err;
  }

  const responseMessage = response.choices[0].message;

  if (!responseMessage.function_call || !responseMessage.function_call.arguments) {
    console.error("Missing function_call or arguments in response:", responseMessage);
    throw new Error("Missing function call arguments in OpenAI response");
  }

  const parameters = JSON.parse(responseMessage.function_call.arguments);
  const primaryCategory = parameters.primaryCategory.split(":")[0];

  if (!selectedCategories.hasOwnProperty(primaryCategory)) {
    throw new Error(`Invalid category "${primaryCategory}" returned from OpenAI.`);
  }

  const validSecondaryCategories = selectedCategories[primaryCategory].categories;

  const messages2 = [
    {
      role: "user",
      content: `Update metadata for this product: "${lotTitle}". ${
        auctionTitle ? `This product was purchased in an auction titled "${auctionTitle}"` : ""
      }`,
    },
  ];

  const functions2 = [
    {
      name: "update_metadata",
      description: `Save metadata about a product for use on the ${competitor} website`,
      parameters: {
        type: "object",
        properties: {
          secondaryCategory: {
            type: "string",
            description: "Category. Must be one of the options provided, if none are appropriate select Other.",
            enum: validSecondaryCategories,
          },
          partOrAccessory: {
            type: "string",
            description:
              "Is this the main unit, or is it a part/accessory designed to complement, repair or enhance the main unit?",
            enum: ["main", "accessory"],
          },
        },
        required: ["secondaryCategory", "partOrAccessory"],
      },
    },
  ];

  let response2;
  try {
    response2 = await openai.chat.completions.create({
      model: process.env.MODEL,
      messages: messages2,
      functions: functions2,
      function_call: { name: "update_metadata" },
      temperature: process.env.temperature,
    });
  } catch (err) {
    console.error("OpenAI request (secondary category) failed:", err);
    throw err;
  }

  const responseMessage2 = response2.choices[0].message;

  if (!responseMessage2.function_call || !responseMessage2.function_call.arguments) {
    console.error("Missing function_call or arguments in second response:", responseMessage2);
    throw new Error("Missing function call arguments in second OpenAI response");
  }

  const args2 = JSON.parse(responseMessage2.function_call.arguments);

  parameters.secondaryCategory = args2.secondaryCategory;
  parameters.partOrAccessory = args2.partOrAccessory;

  if (!validSecondaryCategories.includes(parameters.secondaryCategory)) {
    parameters.secondaryCategory += " - Invalid";
  }

  const prompt_tokens = response.usage.prompt_tokens + response2.usage.prompt_tokens;
  const completion_tokens = response.usage.completion_tokens + response2.usage.completion_tokens;

  parameters.tokens_used = prompt_tokens + completion_tokens;

  if (process.env.MODEL === "gpt-3.5-turbo") {
    parameters.cost_usd =
      (0.0015 / 1000) * prompt_tokens + (0.002 / 1000) * completion_tokens;
  } else if (process.env.MODEL === "gpt-4-turbo") {
    parameters.cost_usd =
      (0.01 / 1000) * prompt_tokens + (0.03 / 1000) * completion_tokens;
  }

  console.log("\nCategory: ", taxonomy, "\nLot: ", lotTitle, "\nAuction: ", auctionTitle, "\n", parameters);

  return parameters;
}

module.exports = {
  runConversation,
};

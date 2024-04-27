const OpenAIApi = require("openai").default; // Accessing the default export
const openai = new OpenAIApi();
const { industryCategoriesSEO, industryCategoriesMeganav, industryCategoriesautocat, artCategories, commercialCategories } = require("./categories.js");

async function runConversation(lotTitle, auctionTitle=null, taxonomy="industrial-meganav") {
  // GET PRIMARY CATEGORY AND OTHER METADATA

  let selectedCategories, competitor;
  if (taxonomy == "art") {
    selectedCategories = artCategories;
    competitor = "Sotheby's, Christie's or Bonhams";
  }
  if (taxonomy == "industrial-seo") {
    selectedCategories = industryCategoriesSEO;
    competitor = "Home Depot, Grainger or Alibaba";
  }
  if (taxonomy == "industrial-meganav") {
    selectedCategories = industryCategoriesMeganav;
    competitor = "Home Depot, Grainger or Alibaba";
  }
  if (taxonomy == "industrial-autocat") {
    selectedCategories = industryCategoriesautocat;
    competitor = "Home Depot, Grainger or Alibaba";
  }
  if (taxonomy == "commercial") {
    selectedCategories = commercialCategories;
    competitor = "eBay, Amazon, Walmart";
  }
   if (taxonomy == "alibabaCategories") {
    selectedCategories = alibabaCategories;
    competitor = "Alibaba";
  }
  if (taxonomy == "LiveAuctioneersCategories") {
    selectedCategories = LiveAuctioneersCategories
    competitor = "Sotheby's, Christie's or Bonhams";
  }

  // console.log(taxonomy)

  const messages = [
    {
      role: "user",
      content: `Update metadata for this product: "${lotTitle}". ${auctionTitle ? `This product was purchased in an auction titled "${auctionTitle}"`:""}`,
    },
  ];

const primaryCategoriesAndDescs = Object.keys(selectedCategories).map(key => {
    return selectedCategories[key].description 
        ? `${key}: ${selectedCategories[key].description}`
        : key;
});


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

  // console.log(primaryCategoriesAndDescs);

  // console.log(messages);

  const response = await openai.chat.completions.create({
    model: process.env.MODEL,
    messages: messages,
    functions: functions,
    function_call: { name: "update_metadata" },
    temperature: process.env.temperature,
  });

  const responseMessage = response.choices[0].message;

  // console.log(responseMessage);

  const parameters = JSON.parse(responseMessage.function_call.arguments);
const primaryCategory = parameters.primaryCategory.split(":")[0];

  if (!selectedCategories.hasOwnProperty(primaryCategory)) {
    throw new Error(
      `Invalid category "${primaryCategory}" returned from OpenAI.`
    );
  }

  const validSecondaryCategories =
    selectedCategories[primaryCategory].categories;

  // ----------

  const messages2 = [
    {
      role: "user",
      content: `Update metadata for this product: "${lotTitle}". ${
        auctionTitle
          ? `This product was purchased in an auction titled "${auctionTitle}"`
          : ""
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

  // console.log(validSecondaryCategories);

  // console.log(messages2);

  const response2 = await openai.chat.completions.create({
    model: process.env.MODEL,
    messages: messages2,
    functions: functions2,
    function_call: { name: "update_metadata" },
    temperature: process.env.temperature,
  });

  const responseMessage2 = response2.choices[0].message;

  // console.log(responseMessage2);

  // ----------

  // Add secondary category, part/accessory and cost to the parameters object
  
  parameters.secondaryCategory =
    JSON.parse(responseMessage2.function_call.arguments).secondaryCategory


if (!validSecondaryCategories.includes(parameters.secondaryCategory)) { parameters.secondaryCategory += " - Invalid"; }


  parameters.partOrAccessory = JSON.parse(
    responseMessage2.function_call.arguments
  ).partOrAccessory;

  let prompt_tokens =
    response.usage.prompt_tokens + response2.usage.prompt_tokens;

  let completion_tokens =
    response.usage.completion_tokens + response2.usage.completion_tokens;

  if (process.env.MODEL == "gpt-3.5-turbo") {
    parameters.cost_usd =
      (0.0015 / 1000) * prompt_tokens + (0.002 / 1000) * completion_tokens;
  }

  if (process.env.MODEL == "gpt-4-turbo") {
    parameters.cost_usd =
      (0.01 / 1000) * prompt_tokens + (0.03 / 1000) * completion_tokens;
  }

  parameters.tokens_used = prompt_tokens + completion_tokens;

  console.log("\nCategory: ", taxonomy, "\nLot: ", lotTitle, "\nAuction: ", auctionTitle, "\n", parameters);

  // Return the updated parameters object
  return parameters;
}

module.exports = {
  runConversation,
};

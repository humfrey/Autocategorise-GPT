AutocatGPT is a simple API service built with Node.js, using the OpenAI API to categorize marketplace products into a multi-level taxonomy based on unstructured descriptions.

## Features

Multi-Level Taxonomy: Supports categorization into a detailed hierarchy of product types, enhancing searchability and organization.
API Playground: A simple UI to test API requests and view responses directly.

## Sample .env file

OPENAI_API_KEY="[Your OpenAI API Key]"  
\# MODEL = "gpt-3.5-turbo"  
MODEL = "gpt-4-turbo"  
TEMPERATURE = 0  
MAXIMUM_INPUT_LENGTH = 90 # Hardcoded in API playground

## How to use

Run the app using `npm start`

### Using the API Playground

Visit http://localhost:3000/api-playground.html

### Using the API

`GET /categorise/:category/`

Description: Categorizes a product based on its title and optional auction title.

Parameters:  
    category: The taxonomy to use for classification.  
    lotTitle: The title/description of the item.  
    auctionTitle (optional): The title of the auction.  

Curl example:

`curl -G http://localhost:3000/categorise/industrial-seo/ --data-urlencode "lotTitle=Example Lot Title" --data-urlencode "auctionTitle=Optional Auction Title"`

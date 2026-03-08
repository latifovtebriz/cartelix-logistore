package com.logistore.service;

import com.logistore.model.Product;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.ArrayList;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestClient restClient;

    public GeminiService() {
        this.restClient = RestClient.create();
    }

    public String analyzeProductHealth(Product product) {
        String dbTags = product.getHealthTags() != null ? product.getHealthTags() : "Unknown";

        try {
            // Construct Prompt - SHORTER response requested
            String promptText = String.format(
                    "You are a nutritionist AI. Analyze this product BRIEFLY:\n" +
                            "Name: %s\n" +
                            "Ingredients: %s\n" +
                            "DB Tags: [%s]\n\n" +
                            "Output STRICT JSON (keep advice to MAX 2 sentences in Azerbaijani):\n" +
                            "{\n" +
                            "  \"summary\": \"1 sentence verdict (Azerbaijani)\",\n" +
                            "  \"riskLevel\": \"LOW/MEDIUM/HIGH\",\n" +
                            "  \"advice\": \"Max 2 sentences of advice (Azerbaijani)\"\n" +
                            "}",
                    product.getName(), product.getIngredients(), dbTags);

            // Create Request
            GeminiRequest request = new GeminiRequest();
            request.contents = new ArrayList<>();
            request.contents.add(new GeminiContent(promptText));

            // Call API
            String fullUrl = apiUrl + apiKey;
            GeminiResponse response = restClient.post()
                    .uri(fullUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && !response.candidates.isEmpty()) {
                String rawJson = response.candidates.get(0).content.parts.get(0).text;
                // Clean markdown code blocks if present
                rawJson = rawJson.replace("```json", "").replace("```", "").trim();
                return rawJson;
            }

            return generateFallbackResponse(product);

        } catch (Exception e) {
            System.err.println("Gemini API Error: " + e.getMessage());
            return generateFallbackResponse(product);
        }
    }

    public String suggestRecipe(List<String> ingredients) {
        try {
            // Filter empty ingredients
            List<String> validIngredients = ingredients.stream()
                    .filter(i -> i != null && !i.trim().isEmpty())
                    .toList();

            if (validIngredients.isEmpty()) {
                return "{\"status\": \"INSUFFICIENT\", \"title\": \"Məhsul tapılmadı\", \"description\": \"Çekdə məhsul məlumatı yoxdur.\", \"ingredients\": [], \"steps\": []}";
            }

            String ingredientsList = String.join(", ", validIngredients);
            String promptText = String.format(
                    "I have these ingredients: [%s]. Suggest 1 simple Azerbaijani or International recipe I can cook. "
                            +
                            "Return STRICT JSON: {" +
                            "\"title\": \"Recipe Name (Azerbaijani)\", " +
                            "\"description\": \"Short appetizing description (Azerbaijani)\", " +
                            "\"ingredients\": [\"List of ingredients I have used\"], " +
                            "\"missingIngredients\": [\"List of extra ingredients I need to buy\"], " +
                            "\"steps\": [\"Step 1 (Azerbaijani)\", \"Step 2\"], " +
                            "\"cookingTime\": \"e.g. 30 dəq\", " +
                            "\"difficulty\": \"Asan/Orta/Çətin\", " +
                            "\"status\": \"FULL_MEAL\" (if I have almost all) or \"PARTIAL_MEAL\" (if I need many things) or \"SNACK\" or \"INSUFFICIENT\""
                            +
                            "}",
                    ingredientsList);

            GeminiRequest request = new GeminiRequest();
            request.contents = new ArrayList<>();
            request.contents.add(new GeminiContent(promptText));

            String fullUrl = apiUrl + apiKey;
            GeminiResponse response = restClient.post()
                    .uri(fullUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(GeminiResponse.class);

            if (response != null && !response.candidates.isEmpty()) {
                String rawJson = response.candidates.get(0).content.parts.get(0).text;
                return rawJson.replace("```json", "").replace("```", "").trim();
            }
            return "{\"status\": \"INSUFFICIENT\", \"title\": \"AI cavab vermədi\", \"description\": \"Yenidən cəhd edin.\", \"ingredients\": [], \"steps\": []}";
        } catch (Exception e) {
            System.err.println("AI Chef Error: " + e.getMessage());
            return "{\"status\": \"INSUFFICIENT\", \"title\": \"Xəta baş verdi\", \"description\": \"" + e.getMessage()
                    + "\", \"ingredients\": [], \"steps\": []}";
        }
    }

    private String generateFallbackResponse(Product product) {
        String tags = product.getHealthTags() != null ? product.getHealthTags() : "məlumat yoxdur";
        return String.format(
                "{\"summary\": \"Məlumat bazadan götürüldü.\", \"riskLevel\": \"UNKNOWN\", \"advice\": \"Tərkibi: %s. (AI oflayndır)\"}",
                tags);
    }

    // --- DTOs ---
    public static class GeminiRequest {
        public List<GeminiContent> contents;
    }

    public static class GeminiContent {
        public List<GeminiPart> parts;

        public GeminiContent(String text) {
            this.parts = new ArrayList<>();
            this.parts.add(new GeminiPart(text));
        }
    }

    public static class GeminiPart {
        public String text;

        public GeminiPart(String text) {
            this.text = text;
        }

        public GeminiPart() {
        }
    }

    public static class GeminiResponse {
        public List<Candidate> candidates;
    }

    public static class Candidate {
        public Content content;
    }

    public static class Content {
        public List<GeminiPart> parts;
    }
}

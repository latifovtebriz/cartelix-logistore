package com.logistore.controller;

import com.logistore.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/recipe")
    public ResponseEntity<String> suggestRecipe(@RequestBody Map<String, List<String>> payload) {
        List<String> ingredients = payload.get("ingredients");
        String jsonResponse = geminiService.suggestRecipe(ingredients);
        return ResponseEntity.ok(jsonResponse);
    }
}

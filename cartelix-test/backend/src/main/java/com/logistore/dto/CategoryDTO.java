package com.logistore.dto;

import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Data
public class CategoryDTO {
    private Long id;
    private String name;
    private String icon;
    private Long parentId;
    private List<CategoryDTO> subCategories = new ArrayList<>();
}

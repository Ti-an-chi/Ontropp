
// specEngine.js

// Resolve database/product category IDs to the specification engine's
// canonical category vocabulary.
const CATEGORY_ALIASES = {
  product_clothing: 'tailoring',
  product_bags: 'designer_bags',
  product_footwear: 'designer_footwear',
  product_jewellery: 'jewellery',
  product_accessories: 'jewellery',
  product_beauty: 'beauty',
  product_textiles: 'textiles',
  product_home_decor: 'objects',
  product_art: 'objects',
  product_prints: 'print'
};

function normalizeCategoryId(categoryId) {
  if (!categoryId) return null;

  const normalized = String(categoryId).trim().toLowerCase();
  return CATEGORY_ALIASES[normalized] || normalized;
}

// Fields are descriptive attributes, not mandatory product requirements.
// Keep category assignments relevant to the products designers actually make.

export const SPEC_FIELDS = [
  // Identification
  {
    id: 'sku',
    name: 'SKU',
    icon: 'fa-barcode',
    categories: [
      'jewellery', 'textiles', 'tailoring', 'beauty',
      'objects', 'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'collection',
    name: 'Collection',
    icon: 'fa-layer-group',
    categories: [
      'jewellery', 'textiles', 'tailoring', 'beauty',
      'objects', 'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },

  // Physical properties
  {
    id: 'material',
    name: 'Material',
    icon: 'fa-cubes',
    categories: [
      'textiles', 'tailoring', 'jewellery', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'color',
    name: 'Color',
    icon: 'fa-palette',
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'size',
    name: 'Size',
    icon: 'fa-ruler-combined',
    categories: [
      'textiles', 'tailoring', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'dimensions',
    name: 'Dimensions',
    icon: 'fa-expand',
    categories: [
      'objects', 'designer_bags', 'designer_footwear', 'crafts'
    ]
  },
  {
    id: 'weight',
    name: 'Weight',
    icon: 'fa-weight-hanging',
    categories: [
      'jewellery', 'objects', 'designer_bags',
      'designer_footwear', 'textiles'
    ]
  },
  {
    id: 'length',
    name: 'Length',
    icon: 'fa-arrows-alt-v',
    categories: [
      'textiles', 'tailoring', 'jewellery',
      'designer_bags', 'designer_footwear'
    ]
  },

  // Design and construction
  {
    id: 'fit',
    name: 'Fit',
    icon: 'fa-shirt',
    categories: ['tailoring']
  },
  {
    id: 'pattern',
    name: 'Pattern',
    icon: 'fa-shapes',
    categories: ['textiles', 'tailoring', 'crafts', 'print']
  },
  {
    id: 'technique',
    name: 'Technique',
    icon: 'fa-wand-magic-sparkles',
    categories: ['textiles', 'tailoring', 'crafts', 'print', 'objects']
  },
  {
    id: 'finish',
    name: 'Finish',
    icon: 'fa-gem',
    categories: [
      'jewellery', 'objects', 'designer_bags',
      'designer_footwear', 'crafts'
    ]
  },
  {
    id: 'closure',
    name: 'Closure Type',
    icon: 'fa-lock',
    categories: ['designer_bags', 'designer_footwear']
  },
  {
    id: 'stone',
    name: 'Stone Type',
    icon: 'fa-gem',
    categories: ['jewellery']
  },
  {
    id: 'metal',
    name: 'Metal',
    icon: 'fa-ring',
    categories: ['jewellery']
  },
  {
    id: 'sole_material',
    name: 'Sole Material',
    icon: 'fa-shoe-prints',
    categories: ['designer_footwear']
  },
  {
    id: 'heel_height',
    name: 'Heel Height',
    icon: 'fa-ruler-vertical',
    categories: ['designer_footwear']
  },

  // Usage and suitability
  {
    id: 'occasion',
    name: 'Occasion',
    icon: 'fa-calendar-check',
    categories: [
      'tailoring', 'jewellery', 'designer_bags',
      'designer_footwear', 'beauty'
    ]
  },
  {
    id: 'skin_type',
    name: 'Skin Type',
    icon: 'fa-hand-sparkles',
    categories: ['beauty']
  },
  {
    id: 'ingredients',
    name: 'Ingredients',
    icon: 'fa-flask',
    categories: ['beauty']
  },
  {
    id: 'volume',
    name: 'Volume',
    icon: 'fa-fill-drip',
    categories: ['beauty']
  },
  {
    id: 'care',
    name: 'Care Instructions',
    icon: 'fa-soap',
    categories: [
      'textiles', 'tailoring', 'beauty', 'jewellery',
      'objects', 'designer_bags', 'designer_footwear'
    ]
  },

  // Provenance
  {
    id: 'origin',
    name: 'Origin',
    icon: 'fa-map-marker-alt',
    categories: [
      'textiles', 'tailoring', 'jewellery', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  }
];

export const SPEC_VALUES = [
  // Collections
  {
    id: 'limited_edition',
    name: 'Limited Edition',
    fields: ['collection'],
    categories: [
      'jewellery', 'textiles', 'tailoring', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },

  // Materials
  {
    id: 'cotton',
    name: 'Cotton',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'silk',
    name: 'Silk',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'linen',
    name: 'Linen',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'ankara',
    name: 'Ankara Print',
    fields: ['material', 'pattern'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'lace',
    name: 'Lace',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'chiffon',
    name: 'Chiffon',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'velvet',
    name: 'Velvet',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'denim',
    name: 'Denim',
    fields: ['material'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'leather',
    name: 'Leather',
    fields: ['material'],
    categories: [
      'tailoring', 'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'suede',
    name: 'Suede',
    fields: ['material'],
    categories: ['designer_bags', 'designer_footwear']
  },
  {
    id: 'canvas',
    name: 'Canvas',
    fields: ['material'],
    categories: ['textiles', 'objects', 'designer_bags', 'print']
  },
  {
    id: 'wood',
    name: 'Wood',
    fields: ['material'],
    categories: ['objects', 'crafts']
  },
  {
    id: 'ceramic',
    name: 'Ceramic',
    fields: ['material'],
    categories: ['objects', 'crafts']
  },
  {
    id: 'glass',
    name: 'Glass',
    fields: ['material'],
    categories: ['objects', 'crafts', 'jewellery']
  },
  {
    id: 'acrylic',
    name: 'Acrylic',
    fields: ['material'],
    categories: ['jewellery', 'objects', 'crafts', 'print']
  },
  {
    id: 'stainless_steel',
    name: 'Stainless Steel',
    fields: ['material', 'metal'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'gold',
    name: 'Gold',
    fields: ['material', 'metal'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'silver',
    name: 'Silver',
    fields: ['material', 'metal'],
    categories: ['jewellery']
  },
  {
    id: 'gold_plated',
    name: 'Gold-plated',
    fields: ['material', 'metal'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'gold_filled',
    name: 'Gold-filled',
    fields: ['material', 'metal'],
    categories: ['jewellery']
  },
  {
    id: 'brass',
    name: 'Brass',
    fields: ['material', 'metal'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'platinum',
    name: 'Platinum',
    fields: ['material', 'metal'],
    categories: ['jewellery']
  },
  {
    id: 'paper',
    name: 'Paper',
    fields: ['material'],
    categories: ['print', 'crafts', 'objects']
  },

  // Stones
  {
    id: 'diamond',
    name: 'Diamond',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'pearl',
    name: 'Pearl',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'crystal',
    name: 'Crystal',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'turquoise',
    name: 'Turquoise',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'emerald',
    name: 'Emerald',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'ruby',
    name: 'Ruby',
    fields: ['stone'],
    categories: ['jewellery']
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    fields: ['stone'],
    categories: ['jewellery']
  },

  // Colors
  {
    id: 'black',
    name: 'Black',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'white',
    name: 'White',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'red',
    name: 'Red',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'blue',
    name: 'Blue',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'green',
    name: 'Green',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'brown',
    name: 'Brown',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'objects',
      'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'pink',
    name: 'Pink',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'purple',
    name: 'Purple',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'yellow',
    name: 'Yellow',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'orange',
    name: 'Orange',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'ivory',
    name: 'Ivory',
    fields: ['color'],
    categories: [
      'jewellery', 'textiles', 'tailoring', 'objects',
      'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'gold_color',
    name: 'Gold',
    fields: ['color'],
    categories: [
      'jewellery', 'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'silver_color',
    name: 'Silver',
    fields: ['color'],
    categories: [
      'jewellery', 'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'multicolor',
    name: 'Multicolor',
    fields: ['color'],
    categories: [
      'textiles', 'tailoring', 'jewellery', 'beauty',
      'objects', 'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },

  // Patterns
  {
    id: 'floral',
    name: 'Floral',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'crafts', 'print']
  },
  {
    id: 'geometric',
    name: 'Geometric',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'crafts', 'print']
  },
  {
    id: 'abstract',
    name: 'Abstract',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'crafts', 'print']
  },
  {
    id: 'striped',
    name: 'Striped',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'print']
  },
  {
    id: 'checkered',
    name: 'Checkered',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'print']
  },
  {
    id: 'animal_print',
    name: 'Animal Print',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'designer_bags']
  },
  {
    id: 'plain',
    name: 'Plain',
    fields: ['pattern'],
    categories: ['textiles', 'tailoring', 'print']
  },

  // Size
  {
    id: 'xs',
    name: 'XS',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 's',
    name: 'S',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'm',
    name: 'M',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'l',
    name: 'L',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'xl',
    name: 'XL',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'xxl',
    name: 'XXL',
    fields: ['size'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'one_size',
    name: 'One Size',
    fields: ['size'],
    categories: [
      'textiles', 'tailoring', 'designer_bags', 'designer_footwear'
    ]
  },

  // Fit
  {
    id: 'oversized',
    name: 'Oversized',
    fields: ['fit'],
    categories: ['tailoring']
  },
  {
    id: 'slim',
    name: 'Slim Fit',
    fields: ['fit'],
    categories: ['tailoring']
  },
  {
    id: 'regular',
    name: 'Regular Fit',
    fields: ['fit'],
    categories: ['tailoring']
  },
  {
    id: 'relaxed',
    name: 'Relaxed Fit',
    fields: ['fit'],
    categories: ['tailoring']
  },
  {
    id: 'tailored',
    name: 'Tailored Fit',
    fields: ['fit'],
    categories: ['tailoring']
  },

  // Finish
  {
    id: 'matte',
    name: 'Matte',
    fields: ['finish'],
    categories: ['jewellery', 'objects', 'designer_bags', 'crafts']
  },
  {
    id: 'glossy',
    name: 'Glossy',
    fields: ['finish'],
    categories: ['jewellery', 'objects', 'crafts']
  },
  {
    id: 'polished',
    name: 'Polished',
    fields: ['finish'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'brushed',
    name: 'Brushed',
    fields: ['finish'],
    categories: ['jewellery', 'objects']
  },
  {
    id: 'textured',
    name: 'Textured',
    fields: ['finish'],
    categories: ['jewellery', 'objects', 'designer_bags', 'crafts']
  },

  // Construction techniques
  {
    id: 'handmade',
    name: 'Handmade',
    fields: ['technique'],
    categories: ['textiles', 'tailoring', 'crafts', 'objects', 'print']
  },
  {
    id: 'handwoven',
    name: 'Handwoven',
    fields: ['technique'],
    categories: ['textiles', 'crafts']
  },
  {
    id: 'embroidery',
    name: 'Embroidery',
    fields: ['technique'],
    categories: ['textiles', 'tailoring', 'crafts']
  },
  {
    id: 'beadwork',
    name: 'Beadwork',
    fields: ['technique'],
    categories: ['jewellery', 'textiles', 'crafts']
  },
  {
    id: 'crochet',
    name: 'Crochet',
    fields: ['technique'],
    categories: ['textiles', 'tailoring', 'crafts']
  },
  {
    id: 'knitting',
    name: 'Knitting',
    fields: ['technique'],
    categories: ['textiles', 'tailoring', 'crafts']
  },
  {
    id: 'screen_printing',
    name: 'Screen Printing',
    fields: ['technique'],
    categories: ['textiles', 'print']
  },
  {
    id: 'digital_printing',
    name: 'Digital Printing',
    fields: ['technique'],
    categories: ['textiles', 'print']
  },
  {
    id: 'painting',
    name: 'Painting',
    fields: ['technique'],
    categories: ['crafts', 'objects', 'print']
  },
  {
    id: 'sculpting',
    name: 'Sculpting',
    fields: ['technique'],
    categories: ['objects', 'crafts']
  },

  // Bag and footwear closures
  {
    id: 'zipper',
    name: 'Zipper',
    fields: ['closure'],
    categories: ['designer_bags', 'designer_footwear']
  },
  {
    id: 'magnetic',
    name: 'Magnetic Snap',
    fields: ['closure'],
    categories: ['designer_bags']
  },
  {
    id: 'buckle',
    name: 'Buckle',
    fields: ['closure'],
    categories: ['designer_bags', 'designer_footwear']
  },
  {
    id: 'drawstring',
    name: 'Drawstring',
    fields: ['closure'],
    categories: ['designer_bags']
  },
  {
    id: 'button_closure',
    name: 'Button',
    fields: ['closure'],
    categories: ['designer_bags']
  },
  {
    id: 'lace_up',
    name: 'Lace-up',
    fields: ['closure'],
    categories: ['designer_footwear']
  },
  {
    id: 'slip_on',
    name: 'Slip-on',
    fields: ['closure'],
    categories: ['designer_footwear']
  },

  // Sole materials
  {
    id: 'rubber',
    name: 'Rubber',
    fields: ['sole_material'],
    categories: ['designer_footwear']
  },
  {
    id: 'leather_sole',
    name: 'Leather',
    fields: ['sole_material'],
    categories: ['designer_footwear']
  },
  {
    id: 'eva',
    name: 'EVA',
    fields: ['sole_material'],
    categories: ['designer_footwear']
  },

  // Occasions
  {
    id: 'casual',
    name: 'Casual',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'formal',
    name: 'Formal',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'traditional',
    name: 'Traditional',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'wedding',
    name: 'Wedding',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags',
      'designer_footwear', 'beauty'
    ]
  },
  {
    id: 'everyday',
    name: 'Everyday Wear',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags', 'designer_footwear', 'beauty'
    ]
  },
  {
    id: 'evening',
    name: 'Evening',
    fields: ['occasion'],
    categories: [
      'tailoring', 'jewellery', 'designer_bags', 'designer_footwear', 'beauty'
    ]
  },

  // Beauty
  {
    id: 'all_skin_types',
    name: 'All Skin Types',
    fields: ['skin_type'],
    categories: ['beauty']
  },
  {
    id: 'oily_skin',
    name: 'Oily Skin',
    fields: ['skin_type'],
    categories: ['beauty']
  },
  {
    id: 'dry_skin',
    name: 'Dry Skin',
    fields: ['skin_type'],
    categories: ['beauty']
  },
  {
    id: 'combination_skin',
    name: 'Combination Skin',
    fields: ['skin_type'],
    categories: ['beauty']
  },
  {
    id: 'sensitive_skin',
    name: 'Sensitive Skin',
    fields: ['skin_type'],
    categories: ['beauty']
  },
  {
    id: 'normal_skin',
    name: 'Normal Skin',
    fields: ['skin_type'],
    categories: ['beauty']
  },

  // Care instructions
  {
    id: 'hand_wash',
    name: 'Hand wash only',
    fields: ['care'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'machine_wash',
    name: 'Machine wash',
    fields: ['care'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'dry_clean',
    name: 'Dry clean only',
    fields: ['care'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'cold_wash',
    name: 'Cold wash',
    fields: ['care'],
    categories: ['textiles', 'tailoring']
  },
  {
    id: 'wipe_dry_cloth',
    name: 'Wipe with soft dry cloth',
    fields: ['care'],
    categories: [
      'jewellery', 'objects', 'designer_bags', 'designer_footwear'
    ]
  },
  {
    id: 'avoid_water',
    name: 'Avoid contact with water',
    fields: ['care'],
    categories: ['jewellery', 'designer_bags']
  },
  {
    id: 'store_dry',
    name: 'Store in a dry place',
    fields: ['care'],
    categories: ['jewellery', 'objects', 'designer_bags']
  },

  // Origin
  {
    id: 'made_in_ng',
    name: 'Made in Nigeria',
    fields: ['origin'],
    categories: [
      'jewellery', 'textiles', 'tailoring', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'made_in_ghana',
    name: 'Made in Ghana',
    fields: ['origin'],
    categories: [
      'jewellery', 'textiles', 'tailoring', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  },
  {
    id: 'made_in_africa',
    name: 'Made in Africa',
    fields: ['origin'],
    categories: [
      'jewellery', 'textiles', 'tailoring', 'objects',
      'crafts', 'designer_bags', 'designer_footwear', 'print'
    ]
  }
];

export class SpecEngine {
  constructor() {
    this.fields = SPEC_FIELDS;
    this.values = SPEC_VALUES;
  }

  suggestFields(categoryId, partialName = '') {
    const resolvedCategory = normalizeCategoryId(categoryId);

    let candidates = resolvedCategory
      ? this.fields.filter(f => f.categories.includes(resolvedCategory))
      : this.fields;

    if (partialName) {
      const lower = String(partialName).toLowerCase();

      candidates = candidates.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        f.id.includes(lower)
      );
    }

    return candidates.map(f => ({
      name: f.name,
      id: f.id,
      icon: f.icon
    }));
  }

  suggestValues(fieldName, categoryId, partialValue = '') {
    if (!fieldName) return [];

    const normalizedField = String(fieldName).trim().toLowerCase();

    const matchedField = this.fields.find(f =>
      f.name.toLowerCase() === normalizedField ||
      f.id === normalizedField
    );

    if (!matchedField) return [];

    const resolvedCategory = normalizeCategoryId(categoryId);

    let candidates = this.values.filter(v =>
      v.fields.includes(matchedField.id)
    );

    if (resolvedCategory) {
      candidates = candidates.filter(v =>
        v.categories.includes(resolvedCategory)
      );
    }

    if (partialValue) {
      const lower = String(partialValue).toLowerCase();

      candidates = candidates.filter(v =>
        v.name.toLowerCase().includes(lower) ||
        v.id.includes(lower)
      );
    }

    return candidates.map(v => v.name);
  }

  getFieldIcon(fieldId) {
    if (!fieldId) return 'fa-circle-info';

    const normalizedId = String(fieldId).trim().toLowerCase();

    const field = this.fields.find(f =>
      f.id === normalizedId
    );

    return field ? field.icon : 'fa-circle-info';
  }
}
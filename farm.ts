export const FARM_PLANTS = [
  // Plants (Minecraft crops/saplings style)
  { id: 'cactus', name: 'صبارة الصبر', icon: '🌵', requiredHours: 5, price: 100, desc: 'نبتة بسيطة تتحمل الصعاب.', color: '#2E8B57', shape: 'box', scale: [1, 1, 1], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/cactus/model.gltf' },
  { id: 'sunflower', name: 'زهرة عباد الشمس', icon: '🌻', requiredHours: 10, price: 250, desc: 'تزهر مع شروق شمس الإنجاز.', color: '#FFD700', shape: 'box', scale: [1.5, 1.5, 1.5], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/flower/model.gltf' },
  { id: 'rose', name: 'وردة جورية', icon: '🌹', requiredHours: 15, price: 400, desc: 'تعكس جمال الصبر.', color: '#DC143C', shape: 'box', scale: [1.2, 1.2, 1.2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/flower/model.gltf' },
  { id: 'tulip', name: 'زهرة التوليب', icon: '🌷', requiredHours: 18, price: 500, desc: 'رمز للأناقة.', color: '#FF69B4', shape: 'box', scale: [1, 1, 1], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/flower/model.gltf' },
  { id: 'bonsai', name: 'شجرة بونساي', icon: '🌳', requiredHours: 20, price: 750, desc: 'تحتاج لتركيز عالي.', color: '#006400', shape: 'box', scale: [1, 1, 1], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-small/model.gltf' },
  { id: 'bamboo', name: 'شجرة البامبو', icon: '🎋', requiredHours: 35, price: 1000, desc: 'تنمو بسرعة وقوة.', color: '#9ACD32', shape: 'box', scale: [0.3, 2, 0.3], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/plant/model.gltf' },
  { id: 'sakura', name: 'شجرة الكرز (ساكورا)', icon: '🌸', requiredHours: 50, price: 2000, desc: 'ساحرة للمثابرين.', color: '#FFB7C5', shape: 'box', scale: [1.5, 2, 1.5], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-small/model.gltf' },
  { id: 'palm', name: 'شجرة النخيل', icon: '🌴', requiredHours: 75, price: 3000, desc: 'ثابتة وعالية.', color: '#8B4513', shape: 'box', scale: [0.8, 3, 0.8], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/low-poly-tree/model.gltf' },
  { id: 'tree', name: 'شجرة المعرفة', icon: '🌲', requiredHours: 100, price: 5000, desc: 'أضخم شجرة.', color: '#228B22', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/tree-big/model.gltf' }
];

export const FARM_ANIMALS = [
  // Animals (Minecraft mobs style)
  { id: 'canary', name: 'عصفور كناري', icon: '🐤', requiredLevel: 2, price: 200, desc: 'يغرد لك.', color: '#FFFF00', shape: 'box', scale: [1, 1, 1], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/fish/model.gltf' },
  { id: 'rabbit', name: 'أرنب نشيط', icon: '🐇', requiredLevel: 4, price: 500, desc: 'يقفز حول مزرعتك.', color: '#FFFFFF', shape: 'box', scale: [3, 3, 3], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/bunny/model.gltf' },
  { id: 'owl', name: 'بومة الحكمة', icon: '🦉', requiredLevel: 5, price: 800, desc: 'تراقب دراستك.', color: '#8B4513', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/turkey/model.gltf' },
  { id: 'fox', name: 'ثعلب ذكي', icon: '🦊', requiredLevel: 8, price: 1500, desc: 'يساعدك في إيجاد حلول.', color: '#D2691E', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/dogue/model.gltf' },
  { id: 'cat', name: 'قطة المكتب', icon: '🐈', requiredLevel: 10, price: 2500, desc: 'تنام بجانبك.', color: '#111111', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/dogue/model.gltf' }, // replacing cat with macaque
  { id: 'penguin', name: 'بطريق لطيف', icon: '🐧', requiredLevel: 12, price: 3500, desc: 'يبرد أعصابك.', color: '#000000', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/turkey/model.gltf' },
  { id: 'dog', name: 'كلب وفي', icon: '🐕', requiredLevel: 15, price: 5000, desc: 'يحرس مزرعة إنجازاتك.', color: '#CD853F', shape: 'box', scale: [2, 2, 2], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/dogue/model.gltf' },
  { id: 'horse', name: 'حصان عربي', icon: '🐎', requiredLevel: 20, price: 8000, desc: 'رمز الأصالة.', color: '#8B4513', shape: 'box', scale: [3, 3, 3], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/low-poly-horse/model.gltf' },
  { id: 'dolphin', name: 'دلفين بحري', icon: '🐬', requiredLevel: 25, price: 12000, desc: 'ذكي ومرح.', color: '#4682B4', shape: 'box', scale: [0.6, 0.6, 1.5], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/fish/model.gltf' }
];

export const FARM_STRUCTURES = [
  { id: 'bird_barn', name: 'حظيرة الطيور', icon: '🪹', requiredLevel: 5, price: 1000, desc: 'مأوى الطيور والمثابرة.', color: '#A0522D', shape: 'box', scale: [4, 4, 4], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/house-3/model.gltf' },
  { id: 'cat_barn', name: 'بيت القطط', icon: '🏡', requiredLevel: 10, price: 2000, desc: 'عش القطط الدافئ.', color: '#DEB887', shape: 'box', scale: [4, 4, 4], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/house-5/model.gltf' },
  { id: 'horse_barn', name: 'إسطبل الخيل', icon: '🛖', requiredLevel: 20, price: 5000, desc: 'إسطبل واسع للخيول.', color: '#5C4033', shape: 'box', scale: [6, 5, 6], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/house-4/model.gltf' },
  { id: 'dog_house', name: 'بيت الكلب', icon: '🏠', requiredLevel: 15, price: 2500, desc: 'يحفظ الكلب الوفي.', color: '#8B4513', shape: 'box', scale: [3, 3, 3], modelUrl: 'https://raw.githubusercontent.com/pmndrs/market-assets/main/files/models/house-18/model.gltf' },
  { id: 'fence', name: 'سياج خشبي', icon: '🚧', requiredLevel: 2, price: 50, desc: 'سياج إضافي للمزرعة.', color: '#8B4513', shape: 'box', scale: [3, 1.5, 0.2] },
];

export const ALL_FARM_ITEMS = [...FARM_PLANTS, ...FARM_ANIMALS, ...FARM_STRUCTURES];

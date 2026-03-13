import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const categories = [
    {
      name: 'Kaas & Zuivel',
      slug: 'kaas-zuivel',
      description: 'Authentic Dutch cheeses and dairy products',
      imageUrl: '/images/categories/kaas-zuivel.png',
      products: [
        { name: 'Gouda Jong', slug: 'gouda-jong', description: 'Young, creamy Gouda cheese with a mild, buttery flavor. Perfect for sandwiches and snacking.', price: 4.99, imageUrl: '/images/products/gouda-jong.png' },
        { name: 'Gouda Oud', slug: 'gouda-oud', description: 'Aged Gouda with a deep, complex flavor and crunchy cheese crystals. A Dutch classic.', price: 6.49, imageUrl: '/images/products/gouda-oud.png' },
        { name: 'Edammer Kaas', slug: 'edammer-kaas', description: 'Semi-hard cheese with a distinctive red wax coating. Mild and slightly nutty taste.', price: 5.29, imageUrl: '/images/products/edammer-kaas.png' },
        { name: 'Leidse Kaas', slug: 'leidse-kaas', description: 'Traditional Leiden cheese spiced with cumin seeds. A unique Dutch specialty.', price: 5.99, imageUrl: '/images/products/leidse-kaas.png' },
        { name: 'Boeren Boerenkaas', slug: 'boeren-boerenkaas', description: 'Artisan farmer\'s cheese made with raw milk. Rich, creamy, and full of character.', price: 7.49, imageUrl: '/images/products/boeren-boerenkaas.png' },
      ],
    },
    {
      name: 'Snoep & Gebak',
      slug: 'snoep-gebak',
      description: 'Traditional Dutch sweets and pastries',
      imageUrl: '/images/categories/snoep-gebak.png',
      products: [
        { name: 'Stroopwafels', slug: 'stroopwafels', description: 'Pack of 8 authentic Dutch syrup waffles with gooey caramel filling. Best enjoyed warm over a cup of tea.', price: 2.99, imageUrl: '/images/products/stroopwafels.png' },
        { name: 'Gevulde Koeken', slug: 'gevulde-koeken', description: 'Round butter cookies filled with sweet almond paste. A beloved Dutch treat.', price: 3.49, imageUrl: '/images/products/gevulde-koeken.png' },
        { name: 'Haagse Hopjes', slug: 'haagse-hopjes', description: 'Classic coffee-flavored hard candies from The Hague. A Dutch candy tradition since 1794.', price: 2.79, imageUrl: '/images/products/haagse-hopjes.png' },
        { name: 'Tompouce', slug: 'tompouce', description: 'Iconic Dutch pastry with layers of puff pastry, custard cream, and pink icing on top.', price: 1.99, imageUrl: '/images/products/tompouce.png' },
        { name: 'Drop', slug: 'drop', description: 'Assorted Dutch licorice in various shapes and flavors. The Netherlands\' favorite candy!', price: 2.49, imageUrl: '/images/products/drop.png' },
      ],
    },
    {
      name: 'Bloemen & Planten',
      slug: 'bloemen-planten',
      description: 'Beautiful Dutch flowers and plants',
      imageUrl: '/images/categories/bloemen-planten.png',
      products: [
        { name: 'Tulpen Boeket', slug: 'tulpen-boeket', description: 'A stunning bouquet of fresh Dutch tulips in mixed colors. The quintessential Dutch gift.', price: 7.99, imageUrl: '/images/products/tulpen-boeket.png' },
        { name: 'Daffodil Mix', slug: 'daffodil-mix', description: 'A cheerful bunch of yellow and white daffodils. Perfect for brightening any room.', price: 6.49, imageUrl: '/images/products/daffodil-mix.png' },
        { name: 'Hyacinth Pot', slug: 'hyacinth-pot', description: 'A fragrant purple hyacinth in a decorative pot. Brings spring indoors.', price: 5.99, imageUrl: '/images/products/hyacinth-pot.png' },
        { name: 'Orchidee', slug: 'orchidee', description: 'An elegant white phalaenopsis orchid in a stylish pot. Long-lasting beauty.', price: 12.99, imageUrl: '/images/products/orchidee.png' },
        { name: 'Tulpenbollen', slug: 'tulpenbollen', description: 'Pack of 10 premium tulip bulbs. Plant in autumn for a colorful spring garden.', price: 8.99, imageUrl: '/images/products/tulpenbollen.png' },
      ],
    },
    {
      name: 'Delicatessen',
      slug: 'delicatessen',
      description: 'Authentic Dutch delicacies and savory treats',
      imageUrl: '/images/categories/delicatessen.png',
      products: [
        { name: 'Hollandse Nieuwe Haring', slug: 'hollandse-haring', description: 'Fresh Dutch raw herring, lightly cured. Served with chopped onions and pickles.', price: 4.49, imageUrl: '/images/products/hollandse-haring.png' },
        { name: 'Bitterballen', slug: 'bitterballen', description: 'Pack of 12 crispy Dutch meat croquette balls. Golden-fried perfection, best with mustard.', price: 5.99, imageUrl: '/images/products/bitterballen.png' },
        { name: 'Rookworst', slug: 'rookworst', description: 'Traditional Dutch smoked sausage. Essential for stamppot and erwtensoep.', price: 3.99, imageUrl: '/images/products/rookworst.png' },
        { name: 'Erwtensoep', slug: 'erwtensoep', description: 'Hearty Dutch split pea soup (800ml). Thick enough for a spoon to stand in!', price: 4.29, imageUrl: '/images/products/erwtensoep.png' },
        { name: 'Kibbeling', slug: 'kibbeling', description: 'Frozen crispy fried cod bites. A beloved Dutch street food, serve with garlic sauce.', price: 6.99, imageUrl: '/images/products/kibbeling.png' },
      ],
    },
    {
      name: 'Ambachten & Cadeaus',
      slug: 'ambachten-cadeaus',
      description: 'Traditional Dutch crafts and gift items',
      imageUrl: '/images/categories/ambachten-cadeaus.png',
      products: [
        { name: 'Delfts Blauw Bord', slug: 'delfts-blauw-bord', description: 'Hand-painted Delft Blue decorative plate with classic windmill scene. A timeless Dutch keepsake.', price: 14.99, imageUrl: '/images/products/delfts-blauw-bord.png' },
        { name: 'Miniatuur Klompen', slug: 'miniatuur-klompen', description: 'Pair of miniature painted wooden clogs. Traditional Dutch souvenir, beautifully crafted.', price: 8.99, imageUrl: '/images/products/miniatuur-klompen.png' },
        { name: 'Windmolen Beeldje', slug: 'windmolen-beeldje', description: 'Decorative ceramic Dutch windmill figurine. A charming piece of Holland for your home.', price: 11.99, imageUrl: '/images/products/windmolen-beeldje.png' },
        { name: 'Holland Theedoek', slug: 'holland-theedoek', description: 'Blue and white cotton tea towel with traditional Dutch windmill and tulip print.', price: 6.99, imageUrl: '/images/products/holland-theedoek.png' },
        { name: 'Amsterdamse Grachten Mok', slug: 'amsterdamse-grachten-mok', description: 'Ceramic mug featuring beautiful illustrations of Amsterdam\'s iconic canal houses.', price: 9.49, imageUrl: '/images/products/amsterdamse-grachten-mok.png' },
      ],
    },
  ];

  for (const cat of categories) {
    const { products, ...categoryData } = cat;
    const category = await prisma.category.create({ data: categoryData });

    for (const prod of products) {
      await prisma.product.create({
        data: {
          ...prod,
          categoryId: category.id,
        },
      });
    }
  }

  console.log('Seed completed: 5 categories, 25 products');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

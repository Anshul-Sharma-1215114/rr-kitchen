import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding shop config...");
  await prisma.shopConfig.upsert({
    where: { id: "shop_config" },
    update: {},
    create: {
      id: "shop_config",
      name: "RR Kitchen",
      // Flat delivery fee, same for every address — the app doesn't collect
      // or compute distance.
      deliveryFee: 30,
      minOrderValue: 99,
      taxPercent: 5,
      openTime: "09:00",
      closeTime: "22:00",
      // Placeholder — replace with the real shop address in Settings (no
      // street address is printed on the menu signage this was sourced from).
      address: "12 Temple Street, Indiranagar, Bengaluru 560038",
      // Placeholder VPA — the menu's UPI QR code isn't machine-readable from
      // a photo, so replace with the real one in Settings.
      upiId: "rrkitchen@upi",
      // Real number, taken from RR Kitchen's own printed menu ("For Orders
      // & Enquiries").
      whatsappNumber: "+919691888057",
    },
  });

  // Real RR Kitchen menu, transcribed from the shop's own printed menu card
  // and signage (categories, dish names, and prices match exactly; Hindi
  // names translated to English). The whole menu is vegetarian. "Thali" has
  // no separately-priced Dal on the menu, so it's a flat-priced dish here
  // rather than a Combo — building it as a Combo would mean inventing a
  // standalone Dal price that doesn't exist anywhere on the real menu.
  console.log("Seeding categories...");
  const categoryNames = ["Breakfast", "South Indian", "Main Course", "Beverages"];
  const categories: Record<string, string> = {};
  for (const [i, name] of categoryNames.entries()) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, sortOrder: i },
    });
    categories[name] = category.id;
  }

  console.log("Seeding menu items...");
  const menuItemsData = [
    // Breakfast
    { name: "Poha", description: "Flattened rice tempered with mustard seeds, turmeric and peanuts, finished with pomegranate and coriander.", price: 20, isVeg: true, category: "Breakfast", image: "poha" },
    { name: "Usal Poha (Nagpur Special)", description: "Poha topped with a spicy Nagpur-style moth bean usal.", price: 50, isVeg: true, category: "Breakfast", image: "usal-poha" },
    { name: "Thalipeeth", description: "Savoury multigrain Maharashtrian pancake, pan-roasted until crisp.", price: 40, isVeg: true, category: "Breakfast", image: "thalipeeth" },
    // South Indian
    { name: "Plain Upma", description: "Semolina cooked with mustard seeds, curry leaves and vegetables.", price: 30, isVeg: true, category: "South Indian", image: "plain-upma" },
    { name: "Yellow Upma", description: "Turmeric-spiced semolina upma with vegetables and peanuts.", price: 50, isVeg: true, category: "South Indian", image: "yellow-upma" },
    { name: "Upma Sambhar (with Chutney)", description: "Plain upma served with hot sambhar and coconut chutney.", price: 70, isVeg: true, category: "South Indian", image: "upma-sambhar" },
    { name: "Plain Dosa", description: "Crisp rice-and-lentil crepe, served with sambhar and chutney.", price: 70, isVeg: true, category: "South Indian", image: "plain-dosa" },
    { name: "Masala Dosa", description: "Crisp dosa filled with spiced potato masala, served with sambhar and chutney.", price: 100, isVeg: true, category: "South Indian", image: "masala-dosa" },
    { name: "Idli Sambhar (2 pcs)", description: "Steamed rice cakes served with sambhar and coconut chutney.", price: 30, isVeg: true, category: "South Indian", image: "idli-sambhar" },
    { name: "Sambhar Vada (2 pcs)", description: "Deep-fried lentil doughnuts soaked in hot sambhar.", price: 80, isVeg: true, category: "South Indian", image: "sambhar-vada" },
    // Main Course
    { name: "Vegetable Sabji (Seasonal)", description: "Home-style seasonal mixed vegetable curry.", price: 100, isVeg: true, category: "Main Course", image: "vegetable-sabji" },
    { name: "Plain Rice", description: "Steamed rice.", price: 80, isVeg: true, category: "Main Course", image: "plain-rice" },
    { name: "Jeera Rice", description: "Rice tempered with cumin.", price: 100, isVeg: true, category: "Main Course", image: "jeera-rice" },
    { name: "Curd Rice / Khichdi", description: "Comforting curd rice or khichdi, made fresh to order.", price: 120, isVeg: true, category: "Main Course", image: "curd-rice-khichdi" },
    { name: "Plain Roti", description: "Whole wheat flatbread.", price: 10, isVeg: true, category: "Main Course", image: "plain-roti" },
    { name: "Butter Roti", description: "Whole wheat flatbread finished with butter.", price: 15, isVeg: true, category: "Main Course", image: "butter-roti" },
    { name: "Plain Paratha", description: "Layered whole wheat flatbread.", price: 20, isVeg: true, category: "Main Course", image: "plain-paratha" },
    { name: "Aloo Paratha", description: "Whole wheat flatbread stuffed with spiced potato.", price: 40, isVeg: true, category: "Main Course", image: "aloo-paratha" },
    { name: "Thali", description: "5 rotis, dal, rice and seasonal sabji — the complete home-style meal.", price: 100, isVeg: true, category: "Main Course", image: "thali" },
    // Beverages
    { name: "Tea (Chai)", description: "Spiced Indian milk tea.", price: 10, isVeg: true, category: "Beverages", image: "tea-chai" },
  ];

  const menuItemIdByName: Record<string, string> = {};
  for (const item of menuItemsData) {
    const id = `${item.category}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const created = await prisma.menuItem.upsert({
      where: { id },
      update: {
        description: item.description,
        price: item.price,
        isVeg: item.isVeg,
        categoryId: categories[item.category],
        imageUrl: `/seed-images/${item.image}.jpg`,
        available: true,
      },
      create: {
        id,
        name: item.name,
        description: item.description,
        price: item.price,
        isVeg: item.isVeg,
        categoryId: categories[item.category],
        imageUrl: `/seed-images/${item.image}.jpg`,
      },
    });
    menuItemIdByName[item.name] = created.id;
  }

  // Remove old placeholder categories/items/combo from earlier demo seed
  // data that don't exist on the real menu, so the app only ever shows
  // RR Kitchen's actual menu.
  console.log("Removing old placeholder menu data...");
  // Historical orders (including ones placed during development testing)
  // may reference the old placeholder combo — clear those references
  // before deleting it, since there's no real combo to point them at
  // instead (the real menu has no combo, just the flat-priced Thali).
  await prisma.orderItem.updateMany({ where: { comboId: { not: null } }, data: { comboId: null } });
  await prisma.comboItem.deleteMany({});
  await prisma.combo.deleteMany({});
  const currentItemIds = Object.values(menuItemIdByName);
  await prisma.orderItem.updateMany({
    where: { menuItemId: { notIn: currentItemIds } },
    data: { menuItemId: null },
  });
  await prisma.menuItem.deleteMany({ where: { id: { notIn: currentItemIds } } });
  await prisma.category.deleteMany({ where: { name: { notIn: categoryNames } } });

  console.log("Seeding coupons...");
  const now = new Date();
  const oneYearOut = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  await prisma.coupon.upsert({
    where: { code: "WELCOME50" },
    update: {},
    create: {
      code: "WELCOME50",
      type: "FLAT",
      value: 50,
      minOrderValue: 199,
      validFrom: now,
      validTo: oneYearOut,
      usageLimit: null,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "SAVE10" },
    update: {},
    create: {
      code: "SAVE10",
      type: "PERCENT",
      value: 10,
      minOrderValue: 149,
      maxDiscount: 100,
      validFrom: now,
      validTo: oneYearOut,
      usageLimit: null,
    },
  });

  console.log("Seeding admin and delivery agent accounts...");
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@rrkitchen.local" },
    update: {},
    create: {
      role: "ADMIN",
      name: "RR Kitchen Admin",
      email: "admin@rrkitchen.local",
      passwordHash: adminPasswordHash,
    },
  });

  const agentPasswordHash = await bcrypt.hash("agent123", 10);
  const agent = await prisma.user.upsert({
    where: { email: "agent1@rrkitchen.local" },
    update: {},
    create: {
      role: "DELIVERY_AGENT",
      name: "Ravi Kumar",
      email: "agent1@rrkitchen.local",
      phone: "9000000001",
      passwordHash: agentPasswordHash,
    },
  });
  await prisma.deliveryAgentProfile.upsert({
    where: { userId: agent.id },
    update: {},
    create: { userId: agent.id, isAvailable: true, isActive: true },
  });

  // Demo customers with a completed order + review each. This gives the
  // homepage's "Popular items" (ranked by real order volume) and
  // "Testimonials" (pulled from the Review model) sections real data to
  // show on a fresh install, instead of the page having to hardcode
  // placeholder content where the schema already has a home for it.
  //
  // Always delete and recreate these rather than skip-if-exists: menu item
  // IDs are derived from name+category, so changing a menu (as happened
  // moving from placeholder data to the real menu) silently orphans old
  // demo orders' item references — they'd sit there with nulled-out
  // menuItemId, invisibly excluded from the popularity ranking. Cascade
  // deletes their OrderItems and Reviews too.
  console.log("Seeding demo customers, orders and reviews...");
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "RRK-DEMO-" } } });
  const taxPercent = 5;

  async function seedDemoOrder(opts: {
    phone: string;
    name: string;
    items: { name: string; quantity: number }[];
    rating: number;
    comment: string;
    daysAgo: number;
  }) {
    const customer = await prisma.user.upsert({
      where: { phone: opts.phone },
      update: {},
      create: { phone: opts.phone, name: opts.name, role: "CUSTOMER" },
    });

    const orderNumber = `RRK-DEMO-${opts.phone.slice(-4)}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber } });
    if (existing) return;

    const lineItems = opts.items.map((i) => {
      const data = menuItemsData.find((m) => m.name === i.name)!;
      return { menuItemId: menuItemIdByName[i.name], comboId: null, name: i.name, quantity: i.quantity, priceAtOrder: data.price };
    });
    const itemsTotal = lineItems.reduce((sum, i) => sum + i.priceAtOrder * i.quantity, 0);
    const taxAmount = Math.round(itemsTotal * (taxPercent / 100) * 100) / 100;
    const totalAmount = itemsTotal + taxAmount;
    const placedAt = new Date(Date.now() - opts.daysAgo * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        type: "TAKEAWAY",
        status: "COMPLETED",
        paymentMethod: "COD",
        paymentStatus: "PAID",
        itemsTotal,
        taxAmount,
        totalAmount,
        placedAt,
        completedAt: placedAt,
        createdAt: placedAt,
        items: { create: lineItems },
      },
    });

    await prisma.review.create({
      data: { orderId: order.id, customerId: customer.id, rating: opts.rating, comment: opts.comment, createdAt: placedAt },
    });
  }

  await seedDemoOrder({
    phone: "9000010001",
    name: "Ananya Rao",
    items: [{ name: "Masala Dosa", quantity: 2 }, { name: "Tea (Chai)", quantity: 1 }],
    rating: 5,
    comment: "Tastes exactly like home-cooked food — the dosa was crisp and the chutney was so fresh. My new regular breakfast order.",
    daysAgo: 3,
  });
  await seedDemoOrder({
    phone: "9000010002",
    name: "Karthik Iyer",
    items: [{ name: "Thali", quantity: 1 }],
    rating: 5,
    comment: "The thali is unbeatable value — every item tasted freshly made, not like it had been sitting around. Will order again.",
    daysAgo: 5,
  });
  await seedDemoOrder({
    phone: "9000010003",
    name: "Priya Sharma",
    items: [{ name: "Masala Dosa", quantity: 2 }, { name: "Tea (Chai)", quantity: 1 }],
    rating: 4,
    comment: "Really good, hygienic packaging and it arrived hot. Delivery was quick since they only cover the local area.",
    daysAgo: 7,
  });
  await seedDemoOrder({
    phone: "9000010004",
    name: "Rahul Verma",
    items: [{ name: "Vegetable Sabji (Seasonal)", quantity: 1 }, { name: "Butter Roti", quantity: 2 }],
    rating: 5,
    comment: "Best home-style sabji I've had from a local kitchen — felt genuinely home-made, not restaurant-heavy.",
    daysAgo: 2,
  });
  await seedDemoOrder({
    phone: "9000010005",
    name: "Sneha Patel",
    items: [{ name: "Thali", quantity: 1 }, { name: "Tea (Chai)", quantity: 1 }],
    rating: 5,
    comment: "Ordered for the whole family — everyone loved it. Great to have a healthy home-style option nearby.",
    daysAgo: 1,
  });

  console.log("Seed complete.");
  console.log("  Admin login:  admin@rrkitchen.local / admin123");
  console.log("  Agent login:  agent1@rrkitchen.local / agent123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

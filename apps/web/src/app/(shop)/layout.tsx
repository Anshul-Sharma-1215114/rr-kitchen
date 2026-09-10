import { CartProvider } from "@/lib/cart-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ContactButtons } from "@/components/contact-buttons";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <ContactButtons />
    </CartProvider>
  );
}

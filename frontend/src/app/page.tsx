import type { Customer } from "@/domain/customer.types";
import { Providers } from "@/providers/Providers";
import { EcommerceHomePage } from "@/features/home/page/EcommerceHomePage";

async function getCustomer(): Promise<Customer | null> {
  return null;
}

export default async function Page() {
  const customer = await getCustomer();
  return (
    <Providers customer={customer}>
      <EcommerceHomePage />
    </Providers>
  );
}

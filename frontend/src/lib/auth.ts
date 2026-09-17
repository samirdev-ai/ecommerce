import type { Customer } from "@/domain/customer.types";

/**
 * Replace with real session lookup:
 *   const session = await getServerSession(authOptions);
 *   return session?.user ?? null;
 */
export async function getCustomer(): Promise<Customer | null> {
  return {
    id: "cust_demo",
    firstName: "Helena",
    email: "helena.park@example.com",
    isAuthenticated: true,
  };
}

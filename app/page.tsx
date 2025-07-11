//import Pricing from '@/components/ui/Pricing/Pricing';
export default function Home() {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <h1>¡Bienvenido a tu plataforma IA!</h1>
      <p>Accede al chat en <a href="/Chat">/chat</a></p>
    </div>
  );
}
import { createClient } from '@/utils/supabase/server';
import {
  getProducts,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';

//export default async function PricingPage() {
  //const supabase = createClient();
  //const [user, products, subscription] = await Promise.all([
    //getUser(supabase),
    //getProducts(supabase),
    //getSubscription(supabase)
  //]);

 // return (
  //  <Pricing
    //  user={user}
      //products={products ?? []}
      //subscription={subscription}
    ///>
  //);
//}

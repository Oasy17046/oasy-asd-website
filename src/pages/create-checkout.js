import Stripe from 'stripe';

export const prerender = false; // Obbligatorio per endpoint API in Astro

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY);

export async function POST({ request }) {
  try {
    const data = await request.json();
    const lineItems = [];

    // Quota partecipante principale
    if (data.isSocio) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `${data.evento || 'Uscita OASY'} - Quota Socio OASY`,
            description: `Iscritto: ${data.nome}`
          },
          unit_amount: 1200,
        },
        quantity: 1,
      });
    } else {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { 
            name: `${data.evento || 'Uscita OASY'} - Quota Standard`,
            description: `Iscritto: ${data.nome} (include polizza CSEN)`
          },
          unit_amount: 1500,
        },
        quantity: 1,
      });
    }

    // Accompagnatori / Minori
    if (data.accompagnatori && data.accompagnatori.length > 0) {
      data.accompagnatori.forEach((acc) => {
        const isMinore = acc.tipo === 'minore';
        const isSocioAcc = acc.tipo === 'adulto_socio';
        const unitAmount = (isMinore || isSocioAcc) ? 1200 : 1500;
        const label = isMinore ? 'Quota Minore Under 18' : (isSocioAcc ? 'Quota Accompagnatore Socio' : 'Quota Accompagnatore Standard');

        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { 
              name: `${data.evento || 'Uscita OASY'} - ${label}`,
              description: `Partecipante: ${acc.nome}`
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        });
      });
    }

    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: data.email,
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/iscrizione-uscita`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Errore Stripe Checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
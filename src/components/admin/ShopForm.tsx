"use client";

import { useActionState } from "react";
import { saveShop } from "@/app/admin/actions";
import type { ShopConfig } from "@/lib/shop/config";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

export function ShopForm({ shop }: { shop: ShopConfig }) {
  const [state, action] = useActionState(saveShop, INITIAL_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      <Field label="Bookshop name" name="name" error={state.fields?.name}>
        <input id="name" name="name" className="field" defaultValue={shop.name} required maxLength={60} />
      </Field>
      <Field label="Tagline" name="tagline">
        <input id="tagline" name="tagline" className="field" defaultValue={shop.tagline} maxLength={120} />
      </Field>
      <Field label="Who signs the notes" name="bookseller" hint="Shown on the notes beside the books and inside the jacket. Left empty, it shows “the bookseller”.">
        <input id="bookseller" name="bookseller" className="field" defaultValue={shop.bookseller} maxLength={60} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" name="city">
          <input id="city" name="city" className="field" defaultValue={shop.city} maxLength={80} />
        </Field>
        <Field label="Public contact" name="contact" hint="Phone, email or address shown on the showcases.">
          <input id="contact" name="contact" className="field" defaultValue={shop.contact} maxLength={120} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Save</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

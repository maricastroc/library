"use client";

import { useActionState } from "react";
import { saveShop } from "@/app/admin/actions";
import type { ShopConfig } from "@/lib/shop/config";
import { Field, SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

export function ShopForm({ shop }: { shop: ShopConfig }) {
  const [state, action] = useActionState(saveShop, INITIAL_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      <Field label="Nome da livraria" name="name" error={state.fields?.name}>
        <input id="name" name="name" className="field" defaultValue={shop.name} required maxLength={60} />
      </Field>
      <Field label="Frase de apresentação" name="tagline">
        <input id="tagline" name="tagline" className="field" defaultValue={shop.tagline} maxLength={120} />
      </Field>
      <Field label="Quem assina as notas" name="bookseller" hint="Aparece nas plaquinhas e dentro do livro. Vazio mostra “a livreira”.">
        <input id="bookseller" name="bookseller" className="field" defaultValue={shop.bookseller} maxLength={60} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cidade" name="city">
          <input id="city" name="city" className="field" defaultValue={shop.city} maxLength={80} />
        </Field>
        <Field label="Contato público" name="contact" hint="Telefone, e-mail ou endereço mostrado nas vitrines.">
          <input id="contact" name="contact" className="field" defaultValue={shop.contact} maxLength={120} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Salvar</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

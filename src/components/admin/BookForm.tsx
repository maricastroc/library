"use client";

import { useActionState, useState } from "react";
import { saveBook } from "@/app/admin/actions";
import { FormFeedback, INITIAL_FORM_STATE, SubmitButton } from "./FormParts";
import { BibliographicFields, NoteCard, RECORD_FORM, ShelfFields, SynopsisField } from "./record/fields";

export function BookForm({ signature }: { signature: string }) {
  const [state, action] = useActionState(saveBook, INITIAL_FORM_STATE);
  const [dirty, setDirty] = useState(false);
  const [words, setWords] = useState(0);
  const errors = state.fields ?? {};

  return (
    <form
      id={RECORD_FORM}
      action={action}
      className="record"
      noValidate
      onInput={(event) => {
        setDirty(true);
        const field = event.target as HTMLTextAreaElement;
        if (field.name === "synopsis") setWords(field.value.trim() ? field.value.trim().split(/\s+/).length : 0);
      }}
    >
      <fieldset className="sheet-part">
        <legend className="eyebrow sheet-legend">The record</legend>
        <BibliographicFields book={null} errors={errors} />
      </fieldset>
      <fieldset className="sheet-part">
        <legend className="eyebrow sheet-legend">On sale in the shop</legend>
        <ShelfFields book={null} errors={errors} />
      </fieldset>
      <fieldset className="sheet-part">
        <legend className="eyebrow sheet-legend">Synopsis</legend>
        <SynopsisField book={null} words={words} />
      </fieldset>
      <fieldset className="sheet-part">
        <legend className="eyebrow sheet-legend">Your note</legend>
        <NoteCard book={null} signature={signature} />
      </fieldset>
      <div className="save-bar" data-dirty={dirty ? "true" : undefined}>
        <SubmitButton>Add the book</SubmitButton>
        {dirty ? <span className="stamp" data-tone="vermilion">not added yet</span> : null}
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

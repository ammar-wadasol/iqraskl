"use client";

import { startTransition, useActionState, useEffect, useEffectEvent, useRef } from "react";

// Like useActionState on <form action>, but React does not auto-reset the
// form, so typed values survive validation errors. Optionally resets on success.
export function useFormAction(action, { resetOnSuccess = false, onSuccess } = {}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef(null);

  const handleSuccess = useEffectEvent(() => {
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.();
  });

  useEffect(() => {
    if (state?.ok) handleSuccess();
  }, [state]);

  function onSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return { state, pending, formRef, onSubmit };
}

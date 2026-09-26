import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Standard form setup for every screen: Zod schema validation, errors shown once a field has
// been touched (not while the user is still typing its first value), then re-checked live.
// formState.isValid drives the disabled state of the submit button.
export default function useZodForm(schema, defaultValues) {
  return useForm({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });
}

import { Controller } from "react-hook-form";

// Connects any field component (StyledInput, DateField, SelectField, SegmentedControl) to
// react-hook-form: passes value + change/blur handlers + the field's validation error.
// Text inputs (marked with a static `isTextField`) get onChangeText — TextInput's own onChange
// passes an event, not the text; the other field components get onChange(value).
export default function FormField({ control, name, component: Field, ...fieldProps }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const changeProp = Field.isTextField ? { onChangeText: onChange } : { onChange };
        return <Field {...fieldProps} {...changeProp} value={value} onBlur={onBlur} error={error?.message} />;
      }}
    />
  );
}

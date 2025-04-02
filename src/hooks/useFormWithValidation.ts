import { useState } from 'react';
import { z } from 'zod';

/**
 * Custom hook for form handling with Zod validation.
 * @param schema - The Zod schema to validate against
 * @param initialValues - The initial form values
 * @returns Form state and handlers
 */
export function useFormWithValidation<T extends z.ZodType<any, any>>(
  schema: T,
  initialValues: z.infer<T>
) {
  type FormValues = z.infer<T>;
  
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});

  /**
   * Handle input change events
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
    
    // Clear error when field is edited
    if (errors[name as keyof FormValues]) {
      const newErrors = { ...errors };
      delete newErrors[name as keyof FormValues];
      setErrors(newErrors);
    }
  };

  /**
   * Handle input blur events to mark fields as touched
   */
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
    
    // Validate the field on blur
    validateField(name as keyof FormValues);
  };

  /**
   * Validate a single field
   */
  const validateField = (field: keyof FormValues): boolean => {
    try {
      // Create a partial schema for just this field
      const fieldSchema = z.object({ [field]: schema.shape[field] });
      fieldSchema.parse({ [field]: values[field] });
      
      // Clear error if validation passes
      if (errors[field]) {
        const newErrors = { ...errors };
        delete newErrors[field];
        setErrors(newErrors);
      }
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === field);
        if (fieldError) {
          setErrors({ ...errors, [field]: fieldError.message });
          return false;
        }
      }
      return true;
    }
  };

  /**
   * Validate all form fields
   */
  const validate = (): boolean => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof FormValues, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof FormValues] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  /**
   * Set a specific form value
   */
  const setValue = (field: keyof FormValues, value: any) => {
    setValues({ ...values, [field]: value });
  };

  /**
   * Reset the form to initial values
   */
  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (
    onSubmit: (values: FormValues) => Promise<void> | void
  ) => async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Partial<Record<keyof FormValues, boolean>> = {};
    Object.keys(values).forEach(key => {
      allTouched[key as keyof FormValues] = true;
    });
    setTouched(allTouched);
    
    if (validate()) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    resetForm,
    setValues,
  };
}

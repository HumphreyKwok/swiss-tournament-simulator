"use client";

// Source: https://github.com/mxkaske/mxkaske.dev/blob/main/components/craft/fancy-multi-select.tsx

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type MultiSelectProps = {
  data: any[];
  placeholder: string;
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export default function MultiSelect({
  data,
  placeholder,
  value,
  onChange,
  disabled = false,
  onOpenChange,
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>(
    value || [],
  );
  const [inputValue, setInputValue] = React.useState("");

  // Find selected users from data based on username values
  const selectedUsers = React.useMemo(() => {
    return selectedValues.map(
      (username) =>
        data.find((user) => user.username === username) || {
          username,
          shownName: username,
        },
    );
  }, [selectedValues, data]);

  // Selectables should be users not in selected values
  const selectables = React.useMemo(() => {
    if (data.length === 0) {
      return [];
    }
    return data.filter((user) => !selectedValues.includes(user.username));
  }, [data, selectedValues]);

  // Update internal state when external value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(value);
    }
  }, [value]);

  // Update parent component when dropdown state changes
  React.useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const handleUnselect = React.useCallback(
    (user: any) => {
      const newSelectedValues = selectedValues.filter(
        (username) => username !== user.username,
      );
      setSelectedValues(newSelectedValues);
      onChange?.(newSelectedValues);
    },
    [selectedValues, onChange],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "" && selectedValues.length > 0) {
            const newSelectedValues = [...selectedValues];
            newSelectedValues.pop();
            setSelectedValues(newSelectedValues);
            onChange?.(newSelectedValues);
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [selectedValues, onChange],
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={`h-auto overflow-visible bg-transparent ${className || ""}`}
    >
      <div className="group border-input ring-offset-background focus-within:ring-ring rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => {
            return (
              <Badge
                key={user.username + placeholder}
                variant="secondary"
                className="text-base"
              >
                {`${user.shownName} (${user.username})`}
                <button
                  className="ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(user);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(user)}
                  disabled={disabled}
                >
                  <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="placeholder:text-muted-foreground ml-2 flex-1 bg-transparent outline-none"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="relative mt-2">
        <CommandList>
          {open && selectables.length > 0 && !disabled ? (
            <div className="bg-popover text-popover-foreground animate-in fixed z-[10] rounded-md border shadow-md outline-none">
              <CommandGroup className="h-full max-h-[300px] overflow-auto">
                {selectables.map((user) => {
                  return (
                    <CommandItem
                      key={user.username + placeholder}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={(value) => {
                        setInputValue("");
                        const newSelectedValues = [
                          ...selectedValues,
                          user.username,
                        ];
                        setSelectedValues(newSelectedValues);
                        onChange?.(newSelectedValues);
                      }}
                      className={"cursor-pointer"}
                    >
                      {`${user.shownName} (${user.username})`}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ) : null}
        </CommandList>
      </div>
    </Command>
  );
}

// Create a FormMultiSelect component for use with react-hook-form
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { useFormContext, ControllerRenderProps } from "react-hook-form";

type FormMultiSelectProps = Omit<
  React.ComponentPropsWithoutRef<typeof MultiSelect>,
  "value" | "onChange"
> & {
  name: string;
  label?: string;
};

export const FormMultiSelect = React.forwardRef<
  HTMLDivElement,
  FormMultiSelectProps
>(({ name, label, ...props }, ref) => {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }: { field: ControllerRenderProps<any, any> }) => (
        <FormItem ref={ref}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <MultiSelect
              {...props}
              value={field.value}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
FormMultiSelect.displayName = "FormMultiSelect";

/*
Example of how to use FormMultiSelect with react-hook-form and zod:

1. Define your Zod schema for validation:
```tsx
import { z } from "zod";

// Define the schema for your multi-select items
const userSchema = z.object({
  username: z.string(),
  shownName: z.string(),
  // other fields...
});

// Include it in your form schema
const formSchema = z.object({
  users: z.array(userSchema), // This will validate an array of user objects
  // other form fields...
});
```

2. Set up your form with react-hook-form:
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { FormMultiSelect } from "@/components/ui/muitl-select";

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      users: [],
      // other defaults...
    },
  });

  const onSubmit = (data) => {
    console.log(data);
    // Process form data...
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormMultiSelect
          name="users"
          label="Select Users"
          data={usersData}
          placeholder="Search users..."
        />
        
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}
```

The FormMultiSelect component will:
1. Handle value state management
2. Provide proper form validation integration
3. Show validation errors via FormMessage
4. Support all standard form accessibility features
*/

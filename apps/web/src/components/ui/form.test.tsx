import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form";
import { Input } from "./input";

const schema = z.object({ name: z.string() });

/** Sets a field error on mount, mirroring `form.setError(...)` in a submit handler. */
function HarnessWithError() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    form.setError("name", { message: "Name is required" });
  }, [form.setError]);

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

describe("FormMessage", () => {
  it("renders the error message text, not just the destructive styling", () => {
    // Regression: FormMessage computed `body` from the field error but never
    // rendered it as the <p>'s children — every validation error in the app
    // showed only a red border/label, with the actual message invisible.
    render(<HarnessWithError />);
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("renders nothing when there is no error and no children", () => {
    function Harness() {
      const form = useForm<z.infer<typeof schema>>({ defaultValues: { name: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage data-testid="message" />
              </FormItem>
            )}
          />
        </Form>
      );
    }
    render(<Harness />);
    expect(screen.queryByTestId("message")).not.toBeInTheDocument();
  });
});

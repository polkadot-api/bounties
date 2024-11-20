import { Form } from "@/components/ui/form";
import { FC } from "react";
import { useForm } from "react-hook-form";
import { twMerge } from "tailwind-merge";

export const SubmitReferendumForm: FC<{
  bountyIndex: number;
  className?: string;
}> = ({ className }) => {
  const form = useForm();

  const onSubmit = (v: any) => console.log(v);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={twMerge("space-y-4", className)}
      >
        Submit referendum
      </form>
    </Form>
  );
};

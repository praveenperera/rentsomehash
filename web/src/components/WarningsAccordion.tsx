import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Warning = {
  title: string;
  body: string;
};

interface WarningsAccordionProps {
  warnings: Warning[];
}

export default function WarningsAccordion({
  warnings,
}: WarningsAccordionProps) {
  return (
    <Accordion
      className="home-warning-accordion border border-border/70 bg-background/70"
      defaultValue={warnings[0] ? [warnings[0].title] : []}
    >
      {warnings.map((warning) => (
        <AccordionItem key={warning.title} value={warning.title}>
          <AccordionTrigger className="px-4 py-4 text-sm font-heading tracking-[-0.03em]">
            {warning.title}
          </AccordionTrigger>
          <AccordionContent className="px-4 text-sm leading-7 text-foreground/74">
            {warning.body}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

"use client";

import { useLocale } from "@/hooks/use-locale";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const { locale, setLocale, locales: availableLocales } = useLocale();
  const t = useTranslations("profile");

  const handleChange = (value: string) => {
    setLocale(value as Locale);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
        <Globe className="h-4 w-4" />
        {t("language")}
      </Label>
      <Select value={locale} onValueChange={handleChange}>
        <SelectTrigger id="language" className="w-full">
          <SelectValue placeholder={t("selectLanguage")} />
        </SelectTrigger>
        <SelectContent>
          {availableLocales.map((loc) => (
            <SelectItem key={loc.code} value={loc.code}>
              {loc.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

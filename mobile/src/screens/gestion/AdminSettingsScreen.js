import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";

import * as G from "../../api/gestion";
import Button from "../../components/Button";
import Field from "../../components/Field";
import { Card, Pill, SmallButton, Title, Toggle, run, styles as ui } from "../../components/admin/ui";
import { colors } from "../../theme";

const TEXT = [
  ["shop_name", "Nom de la boutique"],
  ["contact_phone", "Téléphone"],
  ["whatsapp_number", "WhatsApp (format 221...)"],
  ["contact_email", "Email de contact"],
  ["address", "Adresse"],
  ["opening_hours", "Horaires"],
];
const DEPOSIT = [
  ["deposit_threshold", "Acompte possible à partir de (F)", "En dessous, la cliente paie tout."],
  ["deposit_percent", "Acompte (%)", "Entre 10 et 90."],
  ["deposit_percent_made_to_order", "Acompte articles sur commande / crochet (%)", "Entre 10 et 100."],
  ["minimum_deposit", "Acompte minimum (F)"],
];

export default function AdminSettingsScreen() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [mail, setMail] = useState(null);
  const [testing, setTesting] = useState(false);
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    G.settings().then(setS).catch(() => {});
    G.emailStatus().then(setMail).catch(() => {});
  }, []);
  if (!s) return <ActivityIndicator color={colors.caramel} style={{ marginTop: 60 }} />;

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const r = await run(() => G.saveSettings(s), { success: "Réglages enregistrés." });
      if (r && r !== true) setS(r);
    } finally {
      setSaving(false);
    }
  };

  const numField = ([k, label, hint]) => (
    <Field key={k} label={label} hint={hint} error={errors[k]} value={String(s[k] ?? "")} onChangeText={(t) => set(k)(t.replace(/[^\d]/g, ""))} keyboardType="number-pad" />
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.form} keyboardShouldPersistTaps="handled">
      <Title>Boutique</Title>
      <Card>{TEXT.map(([k, label]) => <Field key={k} label={label} value={s[k] || ""} onChangeText={set(k)} />)}</Card>
      <Title>Acompte</Title>
      <Card>{DEPOSIT.map(numField)}</Card>
      <Title>Livraison</Title>
      <Card>
        <Toggle label="Livraison payable au livreur" hint="La cliente peut payer les frais de livraison à l'arrivée." value={s.allow_delivery_fee_on_arrival} onChange={set("allow_delivery_fee_on_arrival")} />
        {numField(["courier_offer_minutes", "Minutes laissées à un livreur pour accepter"])}
        <Field label="Latitude de la boutique" value={String(s.pickup_latitude)} onChangeText={set("pickup_latitude")} keyboardType="numbers-and-punctuation" />
        <Field label="Longitude de la boutique" value={String(s.pickup_longitude)} onChangeText={set("pickup_longitude")} keyboardType="numbers-and-punctuation" hint="Sert à choisir le livreur le plus proche." />
      </Card>
      <Title>Emails (Brevo)</Title>
      <Card>
        {mail ? (
          <>
            <Pill status={mail.configured ? "on" : "cancelled"} label={mail.configured ? "Brevo est relié" : "Brevo n'est pas encore relié"} />
            <Text style={[ui.sub, { marginTop: 8 }]}>Expéditeur : {mail.sender}</Text>
            <Text style={ui.sub}>Alertes nouvelles commandes : {mail.shop_email || "aucune adresse"}</Text>
            <SmallButton title="M'envoyer un email de test" icon="mail-outline" tone="dark" busy={testing} disabled={!mail.configured} style={{ alignSelf: "flex-start", marginTop: 10 }}
              onPress={async () => { setTesting(true); await run(() => G.sendTestEmail()); setTesting(false); }} />
          </>
        ) : <Text style={ui.sub}>Chargement...</Text>}
      </Card>
      <Button title="Enregistrer les réglages" onPress={save} loading={saving} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

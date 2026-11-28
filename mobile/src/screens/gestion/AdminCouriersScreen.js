import { useState } from "react";
import { Linking, Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, Chips, PagedList, Pill, SmallButton, dateFr, run, styles as ui, usePaged } from "../../components/admin/ui";
import { colors } from "../../theme";
import { confirm } from "../../utils/notify";

const FILTERS = [
  { value: "", label: "Tous" },
  { value: "pending", label: "Candidatures" },
  { value: "approved", label: "Validés" },
  { value: "suspended", label: "Suspendus" },
];

export default function AdminCouriersScreen({ route }) {
  const [status, setStatus] = useState(route.params?.status || "");
  const paged = usePaged(G.couriers, { status });

  const decide = (c, what, title, text, yes) =>
    confirm(title, text, () => run(() => G.courierDecision(c.id, what), {
      onDone: (r) => r?.courier && paged.setItems((list) => list.map((x) => (x.id === c.id ? r.courier : x))),
    }), yes);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucun livreur ici."
        header={<Chips options={FILTERS} value={status} onChange={setStatus} style={{ paddingBottom: 10 }} />}
        renderItem={({ item: c }) => (
          <Card>
            <View style={[ui.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <Text style={ui.name}>{c.name}</Text>
                <Text style={ui.sub}>{c.vehicle_label} · {c.phone} · {c.email}</Text>
                <Text style={ui.sub}>Zones : {c.zones}</Text>
                <Text style={ui.sub}>Candidature du {dateFr(c.created_at, false)} · {c.deliveries_done} livraison(s){c.is_available ? " · disponible" : ""}</Text>
              </View>
              <Pill status={c.status} label={c.status_label} />
            </View>
            {c.motivation ? <Text style={[ui.sub, { marginTop: 8, fontStyle: "italic" }]}>« {c.motivation} »</Text> : null}
            <View style={ui.actions}>
              <SmallButton title="Appeler" icon="call-outline" tone="light" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} />
              {c.status !== "approved" ? <SmallButton title="Valider" icon="checkmark" tone="success" onPress={() => decide(c, "approve", "Valider ce livreur ?", "Vérifiez d'abord sa pièce d'identité. Il recevra un email et pourra prendre des courses.", "Valider")} /> : null}
              {c.status === "approved" ? <SmallButton title="Suspendre" icon="pause" tone="danger" onPress={() => decide(c, "suspend", "Suspendre ce livreur ?", "Il ne recevra plus de courses.", "Suspendre")} /> : null}
              {c.status === "pending" ? <SmallButton title="Refuser" icon="close" tone="danger" onPress={() => decide(c, "reject", "Refuser la candidature ?", "", "Refuser")} /> : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

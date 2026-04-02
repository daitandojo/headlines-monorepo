// apps/headlines-pipeline/src/services/graph.ts
// File 10 of 10
// One-line rationale: Fixing imports for IOpportunity.
import axios from 'axios';
const API_URL = process.env.COGNITI_API_URL || 'http://localhost:4000';
const API_KEY = process.env.COGNITI_API_KEY;
export async function updateGraphFromOpportunity(opp) {
    const triples = [];
    if (opp.contactDetails?.company) {
        triples.push({
            subject: opp.reachOutTo,
            subjectType: 'Person',
            predicate: opp.contactDetails.role || 'AFFILIATED_WITH',
            object: opp.contactDetails.company,
            objectType: 'Company',
        });
    }
    if (opp.basedIn && opp.basedIn.length > 0) {
        for (const location of opp.basedIn) {
            triples.push({
                subject: opp.reachOutTo,
                subjectType: 'Person',
                predicate: 'LOCATED_IN',
                object: location,
                objectType: 'Location',
            });
        }
    }
    if (triples.length === 0)
        return;
    try {
        console.log(`🕸️ [Graph] Sending ${triples.length} relationships to Cogniti Core...`);
        await axios.post(`${API_URL}/graph/triples`, {
            userId: 'headlines-system',
            triples,
        }, {
            headers: { Authorization: `Bearer ${API_KEY}` },
        });
    }
    catch (e) {
        console.error(`❌ [Graph] Sync failed:`, e.message);
    }
}
//# sourceMappingURL=graph.js.map
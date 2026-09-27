# Canonical request v1

Selected design, 27 September 2026. This specifies the River normalization target and the application-owned rendering contract. It is not an implemented adapter, a trained model, or evidence of improved retrieval.

## Decision

River emits a compact, versioned description of requested work. Application code validates it and renders one consistent English description for Memorable. The larger model receives the structured request, exact per-request values, original messages, and execution context.

Reduce variation in expression and irrelevant identifiers. Preserve distinctions that change the requested outcome, applicable procedure, conditions, or permitted actions. Retrieval returns a candidate procedure; matching alone does not establish applicability or authorize execution. Before reuse, the executor compares the original request, normalized record, candidate procedure, and current evidence; schema validation alone cannot establish that they agree.

The schema describes goals and qualifications. It contains no workflow IDs, predicted tools, tool sequences, guessed remedies, computed eligibility, or self-reported confidence scores. Memorable continues to own procedure discovery and matching.

## What changed after challenging the draft

| Alternative | Decision |
|---|---|
| Rewrite each ticket as a nicer sentence | Too much freedom in wording and too little visibility into omitted conditions. Use structured fields and a renderer. |
| Output JSON with arbitrary labels | Field names alone do not normalize meaning. Freeze a small vocabulary and canonical phrase table with the model version. |
| Classify into a saved workflow ID | Couples normalization to a changing procedure library. Describe the requested work independently. |
| Remove every specific value | Would collapse distinct product models, error codes, quantities, and conditions. Only instance identifiers are routinely excluded from matching. |
| Match only action and subject | Loses distinctions such as an eligibility question, a conditional action, and an explicit prohibition. Render all relevant qualifications. |
| Design an unrestricted planning language | Unnecessary for v1. Support declarative tasks and ordinary predicates; preserve unsupported semantics through an explicit unresolved item and the original request. |
| Trust a high similarity score | Similarity does not prove compatible constraints. The executor checks the complete request and current state before reuse. |

## Input owned by the harness

The normalizer receives the current customer message and relevant preceding messages, each with stable message IDs. The application retains the original messages, authenticated customer/tenant identity, time and timezone when known, tool permissions, and policy context. River does not generate or grant those values.

Earlier assistant guesses are not facts. Pronouns may resolve only when the supplied conversation identifies one referent. Relative dates retain their original expression and time context until unambiguous conversion is possible. An unresolved reference does not automatically require asking the customer: the larger model may resolve it from existing records.

## Output contract

Top-level fields are exactly `version`, `tasks`, `entities`, and `unresolved`. Version is `1`. Each task has the fields below. Arrays are present even when empty; an empty array means no such qualification was expressed, not that missing data has been established or policy checks have passed.

| Field | Meaning |
|---|---|
| `id` | Local task reference, `t1`, `t2`, etc. |
| `operation` | One of `retrieve`, `explain`, `assess`, `troubleshoot`, `request`. |
| `subject` | Canonical topic such as `delivery`, `refund`, or `product_issue`. |
| `target` | Reference to the entity the task concerns. |
| `outputs` | Specifically requested information or result details, using canonical names. |
| `reported` | Customer claims or symptoms. Never promoted into verified runtime facts. |
| `conditions` | User-imposed conditions on this task. All top-level conditions must hold. |
| `prohibitions` | Operations the customer excludes, each with its own subject and target. |
| `depends_on` | Other explicitly requested tasks that must complete first. Do not invent tool prerequisites. |

Operation meanings are fixed:

- `retrieve`: obtain an existing state, record, or value. Example: refund status.
- `explain`: explain information, a policy, or how something works.
- `assess`: evaluate a question about a particular case. Example: refund eligibility.
- `troubleshoot`: investigate a reported problem without inventing its remedy.
- `request`: express a requested state change. Example: a refund. This records customer intent; it is not a bypass of permissions, policy, or runtime checks.

The initial subject vocabulary is `delivery`, `refund`, `return`, `cancellation`, `replacement`, `product_issue`, `product_information`, `policy`, `subscription`, and `address`. These describe topics, not supported tools or saved workflows. Unsupported topics are preserved in `unresolved`; do not force them into the closest label. New topics and aliases require deliberate vocabulary updates and regression checks.

Each entity has `kind`, `bindings`, and `attributes`:

- `kind` is one of `order`, `product`, `refund`, `subscription`, `account`, `policy`, or `address`.
- `bindings` contains exact instance values, such as an order ID, email address, serial number, tracking number, or full destination address. Values are copied from input/context; aliases are resolved only through supplied catalog mappings.
- `attributes` contains stated distinctions relevant to choosing work, such as a product model, affected component, service type, or country when relevant. Do not guess them from an opaque identifier.

The application owns the field registry and renderer phrase table. For every admitted subject, output, attribute, and predicate field, they define its meaning, value type, display phrase, and whether a value appears in matching text. Unknown vocabulary prevents validated normalization; snake_case formatting alone does not make a new label valid. Seed this registry from the demo domain and labeled examples before training.

### Claims, conditions, and prohibitions

A predicate is `{ "target": "order_1", "field": "shipped", "op": "eq", "value": false }`. Operators are `eq`, `ne`, `lt`, `lte`, `gt`, `gte`, and `contains`. Values are a string, number, boolean, or entity reference of the form `{ "entity": "product_1" }`. Field definitions supply units and types; the model must not discard a currency or unit to fit a scalar.

Boolean groups use exactly one of `{ "all": [predicateOrGroup, ...] }`, `{ "any": [...] }`, or `{ "not": predicateOrGroup }`. Groups must be nonempty. A task's `reported` and `conditions` arrays may contain these expressions. Their placement determines whether they are reported claims or requirements to check; a claim does not satisfy a condition by itself.

Predicates describe domain concepts, not arbitrary database columns. The execution adapter maps them to fresh evidence. Missing evidence leaves a predicate unresolved. Negating an unresolved predicate does not make it true.

A prohibition has `operation`, `subject`, and `target`, using the same vocabulary as tasks. For example, prohibiting a refund request does not prohibit retrieving an existing refund's status.

`depends_on` records customer-specified ordering; it must be acyclic. Tasks otherwise retain their expressed order. Complicated temporal semantics, exceptions that cannot be expressed by these conditions, or unsupported preferences are preserved as unresolved source text. No partial interpretation is eligible for automatic procedure reuse.

### Unresolved information

Each unresolved item has `kind`, `message_id`, `quote`, and `detail`; it may additionally reference `task_id` or `entity_id`. Kinds are `missing_reference`, `ambiguous_intent`, `contradiction`, and `unsupported_semantics`. The quote must exist in the referenced input message.

Retain every requested clause either in a task or in an unresolved item. An unresolved list is not a dumping ground for omitted but understandable meaning. With any unresolved item, the harness sends the original request and partial interpretation to the larger model's normal solving/clarification path. It does not select the nearest workflow or apply an automatic partial replay.

Do not emit a numeric confidence score. Structural validity, exact-value checks, explicit unresolved items, and held-out behavior are the evidence available to the system; a model's own confidence would not resolve semantic fidelity.

## Worked example

Illustrative customer message: "Order 481 still isn't here. Where is it and when will it arrive? Don't cancel this order or refund it."

```json
{
  "version": 1,
  "tasks": [
    {
      "id": "t1",
      "operation": "retrieve",
      "subject": "delivery",
      "target": "order_1",
      "outputs": ["estimated_arrival", "status"],
      "reported": [
        {"target": "order_1", "field": "received", "op": "eq", "value": false}
      ],
      "conditions": [],
      "prohibitions": [
        {"operation": "request", "subject": "cancellation", "target": "order_1"},
        {"operation": "request", "subject": "refund", "target": "order_1"}
      ],
      "depends_on": []
    }
  ],
  "entities": {
    "order_1": {"kind": "order", "bindings": {"order_id": "481"}, "attributes": {}}
  },
  "unresolved": []
}
```

Canonical matching text:

```text
Task 1: Retrieve delivery information for order_1.
Requested outputs: estimated arrival; current status.
Customer reports: order_1 has not been received.
Restrictions: do not request cancellation of order_1; do not request a refund for order_1.
```

The empty conditions array means the customer expressed no additional condition. The empty attributes object means no additional distinguishing attribute was stated. Neither fills missing business data. The example does not claim the order actually exists or that an arrival estimate is available.

For "Refund order 481 only if it has not shipped", the task uses `operation: request`, `subject: refund`, and this condition:

```json
[
  {"target": "order_1", "field": "shipped", "op": "eq", "value": false}
]
```

The renderer produces "Request a refund for order_1. Condition: order_1 has not shipped." The executor must determine shipment state from current data. The normalizer cannot infer it from the wording.

## Deterministic rendering and matching

1. Validate the structure and registry values. Reject extra keys, dangling references, cyclic dependencies, invalid units, and unsupported predicates. Check copied bindings and unresolved quotations against the supplied input/context. These checks cannot prove that all intent was preserved; that remains an evaluation and runtime interpretation concern.
2. Use fixed phrases for each operation/subject pair and predicate field. River selects semantics; the application selects wording. Example: `retrieve + refund` renders as "Retrieve refund information", `assess + refund` as "Assess refund eligibility", and `request + refund` as "Request a refund". Invalid pairs go to the unresolved path.
3. Render fields in this order: task goal, target attributes, requested outputs, reported claims, conditions, prohibitions, dependencies. Omit empty optional lines. Use fixed punctuation and sentence forms. The matching description does not contain the JSON schema version.
4. Sort and deduplicate set-valued outputs and prohibitions. Preserve task dependencies, relationships, Boolean grouping, and any explicitly meaningful order. Equivalent simple paraphrases should render byte-identically; exact equality for every differently ordered compound request is not a v1 claim.
5. Allocate entity labels by first resolved mention and task labels by expressed task order. Reuse labels for references to the same entity. Render the labels rather than opaque instance values. Do not merge different entities merely because they share a product name.
6. Exclude opaque instance bindings from matching text. Keep exact product models, error codes, meaningful quantities, thresholds, currencies, and conditions when they affect procedure choice. An attribute or predicate is included by default; removing it requires an explicit field-registry decision. Keep the originals available even when an alias has a canonical display name.
7. Preserve negation and the difference between what the customer reports and what they require to be true. Parenthesize Boolean expressions so their scope remains explicit.
8. Use the same renderer for a new request and the task description associated with its captured successful session. The request meaning at capture remains the original request; do not rewrite it as an unconditional description of the remedy the agent happened to perform. Actual outcomes and tool evidence are recorded separately.

Use one full request description for capture and recall in v1. Atomic task records preserve distinctions and dependencies; they do not justify inventing separate successful traces. Shared subprocedures are discovered from actual execution history by Memorable.

Do not add a second homegrown similarity router, a broad-query fallback that drops restrictions, or a workflow hash as an execution shortcut. Identical descriptions may still need different runtime branches because current facts differ.

Memorable's public documentation describes exact, lexical, and vector recall. Its extraction example accepts `session_id`, `task_description`, `harness`, and `tool_calls`. Our structured record is application metadata, not an undocumented extension of that API. The actual adapter must establish which procedure fields are indexed and how the canonical description survives extraction. The public example does not prove byte-identical descriptions receive exact hits. [Memorable documentation](https://www.memorable.sh/docs)

## Cases the implementation must preserve

These are design acceptance cases, not executed model results.

| Input or comparison | Required behavior |
|---|---|
| "Where is order 481?" / "Track order 892 for me" | Same delivery-status matching text; different exact order bindings. |
| "Where is my refund?" / "Am I eligible for a refund?" / "Refund this order" | Respectively retrieve refund state, assess eligibility, and request a refund. |
| "Can you refund order 481?" | Interpret its ordinary use as a requested action when context supports that reading; do not classify politeness mechanically as an eligibility question. |
| "Can I get a refund?" without clarifying context | Preserve ambiguity between an eligibility question and a request if the intended meaning cannot be established. |
| "Do not cancel it" / "Cancel it" | Opposite action semantics. A negated action is not a requested task. |
| "Refund only if unshipped" | Preserve the condition, including when shipment state is unavailable. |
| "Refund if delayed or damaged" / "Refund if delayed and damaged" | Preserve OR versus AND. |
| "Carrier says delivered, but I have not received it" | Preserve both reported claims and their relationship to the same order. Do not replace them with a generic late-delivery label or call either claim verified. |
| "My Burr One shows E3" / "My Pour Kettle Pro screen is blank" | Distinguish product model and symptom; do not guess a replacement/refund remedy. |
| "Order 481 is missing; cancel order 892" | Keep target associations separate. Never transfer an action to the wrong order. |
| "Cancel the subscription, then refund the last renewal" | Two tasks with explicit dependency. If "last renewal" cannot be resolved, retain that unresolved reference. |
| "Refund no more than EUR 50" | Preserve amount, currency, and the upper bound. If the registry cannot express the bound, route the original request through unsupported semantics. |
| "Send it there" without a clear referent/address | Explicit unresolved references; no fabricated binding. |
| "Do not refund it. Actually, please refund it" | Use an explicit correction to supersede the earlier instruction; an unresolved contradiction must not become both permission and prohibition. |
| A supported goal with no suitable saved procedure | A valid normalized request can still miss recall; normal agent solving remains available. |
| An unfamiliar request | Preserve the unfamiliar clause and use the normal solving path; never squeeze it into the nearest known topic. |

## Training and integration acceptance

Label the semantic record first and derive matching text using the renderer. Do not independently ask a model to invent a supposedly equivalent second text target. Keep the normalizer's output compact in transport; pretty printing is for inspection only.

Begin with contrastive examples covering the cases above. Hold out entire paraphrase families and scenario instances, rather than randomly mixing sibling paraphrases across train and test. Also evaluate distinct paraphrase families for the same supported task so known-procedure retrieval is tested directly. Evaluate unseen tasks/procedures separately as fallback cases.

Before reuse is enabled, the fixed acceptance set must have valid structures, exact bindings, preserved requested outputs, and zero omitted or inverted conditions/prohibitions. This is a release criterion for that finite set, not a guarantee of universal semantic correctness. If it fails, keep the original-request solving path.

Compare raw-request recall, a base normalizer, and the River-trained normalizer against the same eligible procedure library. Measure correct procedure reuse, incompatible matches, full task outcomes, fallback rate, total latency, and cost per successful ticket including normalization. Count every ticket, including abstentions; successful reuse must not be reported only on accepted easy cases. Break down performance by ambiguity, negation, condition, product variant, and multi-intent cases.

The current mock shop's tracking result contains the last scan, scan date, and delivered flag; it does not provide an estimated arrival. Preserve an ETA request in the normalized contract, and let the executor report that information as unavailable if it cannot obtain it. Normalization is not permission to fabricate a requested value.

The next implementation step is to encode this contract and its field registry, renderer, and contrastive examples, then run the smallest actual QM/Memorable capture-and-recall round trip. Only observed integration behavior should determine whether the matching projection needs adjustment before River training.

# Hackathon validation — 27 September 2026

Validation pass closed at 15:45 San Francisco time on 27 September 2026. The contact list below is reconciled against actual Sent messages; incoming responses were checked at the cutoff. No new outreach was sent after the cutoff.

Status rechecked at 15:58 PDT in the authenticated Gmail account: the scoped incoming search still contains only the Poke and Duckbill acknowledgments and the Airial rejection. No substantive reply, pilot or LOI was observed. This was a read-only status check; no further messages were sent.

## What the evidence says so far

There is credible public evidence that inference cost matters to agent businesses. There is not yet direct customer validation of this product from today's outreach. Forty-five individual messages have been verified in Gmail Sent from **marc@heliosone.fi**. One recipient route rejected the message. Poke acknowledged receipt at 15:16 PDT under a separate subject. Duckbill sent a support-assistant acknowledgment at 15:27 PDT saying it shared the request with its support team. Neither answered the cost questions. No substantive customer answer, pilot or LOI has been obtained.

At Marc's request, existing experiment outputs were also audited. The [pitch and email claims](pitch-claims.md) used the headline **8.37¢ → 5.65¢ so 32% lower inference cost** from an earlier 100-ticket matched replay. The final run supersedes it: **18.3¢ → 10.0¢ on the same 100 tickets (46% lower)**, and 66% lower from the first 25 to the last 25 of 400 tickets. Separately, **label-routing accuracy improved from 23% to 77% on a 100-case evaluation**. These are separate experiments; the integrated system's savings at matched outcome quality remain unverified. Earlier outreach did not include these newly checked numerical claims.

The intended product uses **a shared, fine-tuned generalist across customers, with no per-customer model training**. The cost comparison concerns ongoing inference/serving cost per task; training is outside this metric.

The opportunity to test is: **discover recurring work from an existing agent's history, turn suitable steps into reusable procedures, and lower inference cost per successful outcome.** This is a hypothesis. Public cost reductions by other companies are not our results.

## Public evidence and its limits

| Evidence | What it supports | What remains unproven |
|---|---|---|
| [Lindy's engineering account](https://www.lindy.ai/blog/migrating-from-claude-to-deepseek?trk=article-ssr-frontend-pulse_little-text-block) reports roughly 90% lower inference cost on migrated routes, with offline evaluation, prompt changes, internal rollout and retention checks. | A consumer/work assistant treats inference economics as an engineering and business problem. | Willingness to adopt our approach, additional savings after the migration, and the size of reusable work. This is self-reported. |
| [Twin's current homepage](https://twin.so/) reports median session cost falling from $9.14 to $3.70 in a production model comparison, with reported quality at 96% of its comparator. | Repeated business agents can have material per-session costs, and teams already optimize them. | Equal task success, independently reproduced savings, or customer demand for our platform. Model switching is an existing alternative. |
| [Skyvern's product page](https://www.skyvern.com/products) advertises generated Playwright code that is cached and reused without model calls on repeat runs. | Reusing executable browser steps is already a product capability. | Our differentiation, cross-tool coverage, history-based discovery advantage, and incremental savings. Vendor performance claims were not tested. |
| [Agentic plan caching](https://arxiv.org/html/2506.14852v1) reports 46.62% average cost reduction and 96.67% of optimal accuracy across its two evaluated applications. | Reuse of plans from past execution is technically plausible. | Those results transferring to our customers, zero quality loss, and commercial demand. This is a research result, not a pilot. |
| [TraceCompiler](https://arxiv.org/abs/2608.02680) mines agent traces into mostly deterministic workflows; its abstract explicitly says compilation costs were not measured and claims no net efficiency result. | Very close prior work exists, and tool-call reduction alone is insufficient proof. | Measured inference savings at matched outcome quality, including runtime normalization and fallback. |
| [Tsenta's founder description](https://www.ycombinator.com/companies/tsenta) describes repeated job applications across many applicant-tracking systems and affordability as a product concern. | A concrete consumer workload with recurring tool interactions. | Its current model spend, existing scripted coverage, and willingness to pay. |
| [Julius's August 2026 product decision](https://julius.ai/articles/notebooks-are-no-longer-necessary) says its power-user cohort finished the same workflows faster and with fewer credits after replacing step-by-step Notebooks with a single prompt. | Improving models and simpler prompting can remove the need for workflow scaffolding. This is relevant counterevidence to investigate. | Whether automatically discovered execution reuse still helps; this compares a user-authored notebook interface with chat, not our implementation. |
| [Elicit's infrastructure job description](https://elicit.com/careers/152b8541-c6d9-4b2f-a4f2-f906b82ec2ed) explicitly ties inference routing and provider choices to cost, latency and quality. | Research products budget engineering effort for inference economics. | The reusable share of their work and the incremental value of our approach. A job description is not an interview. |
| [Retell's displayed pricing example](https://www.retellai.com/pricing) splits an $0.11/minute total into $0.04 LLM, $0.055 voice infrastructure and $0.015 text-to-speech. | The addressable cost is a component of the total bill. Halving only its LLM component would cut this example total by about 18.2%. | Actual customer configuration, internal vendor costs, quality and savings from our approach. This is an illustrative displayed price configuration. |
| [A Retell support discussion](https://community.retellai.com/t/why-are-my-calls-suddenly-much-higher/2441) attributes a user's higher bills to input-context surcharges. | A public user reports cost surprise, and the provider identifies a concrete mechanism. | The user's business scale, willingness to buy, and whether workflow reuse would help more than shorter context. We did not interview this user. |
| [Gumloop's current company description](https://www.ycombinator.com/companies/gumloop) describes agents reflecting on runs and drawing on shared team skills. | History-driven improvement and shared reusable knowledge already have commercial competition. | Whether automated discovery of executable procedures solves an unmet need. Older descriptions of Gumloop as only a visual workflow builder are stale. |
| [Pally's July changelog](https://pally.com/whats-new/2026-07) says the product looks for manual workflows and offers to automate them. | Automatic discovery itself has commercial overlap. | Whether it discovers agent execution patterns, generates reusable executable procedures, or lowers net inference cost. The changelog does not establish those points. |

## Contacted companies

Each row represents one individual email to the listed address. The first 24 use the original discovery message; later messages use the same introduction and call request with a relevant, more specific question. Sent records and exact personalized text are in [outreach-evidence-2026-09-27.json](outreach-evidence-2026-09-27.json).

| Company / contact | Email | Validation area |
|---|---|---|
| Touchy — founders | founders@touchyapp.com | Consumer actions across apps |
| Airial — founders | founders@airial.travel | Travel planning; **rejected by recipient's restricted group** |
| Lindy — Flo Crivello | flo@lindy.ai | General assistant economics |
| HeyClicky — team | hi@heyclicky.com | Assistant routines and model routing |
| Ollie — team | hello@ollie.ai | Family and household assistant |
| Twin — Hugo Mercier | hugo@twin.so | Recurring business agents |
| Letterbook — Dawson Chen | dawson@letterbook.ai | Personal assistant / email work |
| Yuma — Guillaume Luccisano | g@yuma.ai | Ecommerce support agents |
| Risotto — founders | founders@tryrisotto.com | IT support workflows |
| Apten — Daniel Ho | daniel@apten.ai | Repeated sales conversations |
| [Layla — Saad Saeed](https://layla.ai/contact) | saad@layla.ai | Consumer travel planning |
| [Aemon — Richard Zhou / Ray Xu](https://www.ycombinator.com/companies/aemon) | founder@aemon.ai | Research and engineering agents |
| [Tsenta — Agnay Srivastava / Pulkit Gupta](https://www.ycombinator.com/companies/tsenta) | founders@tsenta.com | Consumer job application automation |
| [Vela — Gobhanu / Saatvik Korisepati](https://www.ycombinator.com/companies/vela) | founders@tryvela.ai | Scheduling and coordination |
| [Risely — founders](https://www.ycombinator.com/companies/risely-ai) | founders@risely.ai | University administration agents |
| [Palisade — Jonathan Salama](https://www.ycombinator.com/companies/palisade) | jonathan@runpalisade.com | Marketplace sales agents |
| [Kinect — Varun Kandula](https://www.ycombinator.com/companies/kinect) | varun@trykinect.ai | D2C commerce agents |
| [BIK — Sonakshi Nathani](https://www.ycombinator.com/companies/bik) | sonakshi@bik.ai | Ecommerce agents across channels |
| [Pingo — Michael Xing / Morrie Schonfeld](https://www.ycombinator.com/companies/pingo) | founders@mypingoai.com | Consumer language learning |
| [Canary — founders](https://www.ycombinator.com/companies/canary) | founders@runcanary.ai | Agent-driven software testing |
| [Hessian — founders](https://www.ycombinator.com/companies/hessian) | founders@hessian.sh | Operating custom agents for businesses |
| [Ekpa — Yuga Patel / Anant Asthana](https://www.ycombinator.com/companies/ekpa) | founders@goekpa.com | Consumer research agents |
| [Anglera — Amay Aggarwal / Ray Iyer](https://www.ycombinator.com/companies/anglera) | founders@anglera.com | Repeated product-data enrichment |
| [Decipher — Michael Rosenfield / Rohan Das](https://www.ycombinator.com/companies/decipher-ai) | founders@getdecipher.com | Test generation and maintenance |
| [Jcode — Jeremy Huang](https://www.ycombinator.com/companies/jcode) | jeremy@solosystems.dev | Coding harness; test who pays the inference bill |
| [Veeza — team](https://www.veeza.ai/en/about) | info@veeza.ai | Repeated application forms and document checks |
| [Fini — Deepak Singla](https://www.usefini.com/blog/product-update-october24) | deepak@usefini.com | Support knowledge reuse versus execution reuse |
| [Poke — Interaction team](https://poke.com/faq) | poke@interaction.co | Consumer recipes and cross-app routines |
| [Julius — Rahul Sonwalkar](https://julius.ai/why-join-julius-as-a-designer) | rahul@julius.ai | Analysis workflows; challenge necessity of scaffolding |
| [Jo — founders](https://joprod.fly.dev/faq) | founders@askjo.ai | Personal briefings and recurring routines |
| [Elicit — team routing inbox](https://elicit.com/operations/terms) | help@elicit.com | Research and extraction inference economics |
| [Billow — Joanathan McIntosh](https://www.ycombinator.com/companies/billow-ai-labs) | joan@thebillow.ai | Accounting agents; inference versus expert review |
| [qomplement — Kerim Taray](https://www.ycombinator.com/companies/qomplement) | kerim@qomplement.com | Repeated supply-chain transactions |
| [Last Accounting Company — founders/team](https://www.ycombinator.com/companies/last-accounting-company) | hello@lastaccountingcompany.com | Recurring bookkeeping with human validation |
| [Gumloop — founders](https://www.gumloop.com/blog/feature-alert-gumloop-chrome-extension?5e63b592_page=2) | founders@gumloop.com | Existing agent learning and reusable skills |
| [Illume Labs — Pari Latawa / Frank Lee](https://www.illumelabs.ai/) | founders@illumelabs.ai | Recurring consumer insights and data gathering |
| [Retell AI — founders](https://www.ycombinator.com/companies/retell-ai) | founders@re-tell.ai | Voice-agent bill components; published legacy domain |
| [Ohai — Gabrielle, Director of Marketing](https://www.ohai.ai/blog/Inside-the-new-Ohai/) | gabrielle@teamohai.ai | Routing to the owner of household-agent economics |
| [Duckbill — support/team routing](https://getduckbill.com/pricing) | support@getduckbill.com | Human execution versus inference cost; acknowledgment received |
| [Fabraix — founders](https://www.ycombinator.com/companies/fabraix) | founders@fabraix.com | Repeated security testing versus fresh investigation |
| [OneGrep — founders/team](https://www.ycombinator.com/companies/onegrep) | contactus@onegrep.dev | Recurring DevOps investigations and runbooks |
| [Skyvern — founders](https://github.com/Skyvern-AI/skyvern) | founders@skyvern.com | Expert interview: existing code caching and remaining gaps |
| [Browser Use — sales/team routing](https://browser-use.com/pricing) | sales@browser-use.com | Expert interview: model-cost pass-through and recurring jobs |
| [Composio — support/engineering routing](https://composio.dev/support) | support@composio.dev | Expert interview: model-token costs versus tool-call costs |
| [Conifer — founders/team](https://www.ycombinator.com/companies/conifer) | contact@conifer.build | Expert interview: remaining gaps after model routing and caching |

Delivery limits: Gmail Sent proves submission from the account, not arrival, reading, or interest. Airial's rejection is `550 5.7.133`: the group accepts only its organization or allowed senders. The Touchy email accidentally contains the approved body twice; this was disclosed immediately. No attachments were sent. Decipher's homepage fetch failed, while its founder-authored YC contact and official documentation were present; its delivery remains unverified.

Jo's founders address appeared in its publicly indexed hosted FAQ and a corroborating company listing; the current main-domain FAQ omitted the contact. Elicit and several other rows use a team inbox, not a verified direct founder inbox. These distinctions matter when interpreting response rates.

The [Duckbill acknowledgment screenshot](duckbill-acknowledgment.png) records a working support route. It does not prove a founder read the message or validate the problem.

The infrastructure providers were contacted for expert feedback; inclusion does not imply they are buyers. [Browser Use](https://browser-use.com/pricing) publicly prices hosted agent inference at model cost plus a 20% service fee, with browser and traffic costs separate. [Composio](https://composio.dev/pricing) separately meters tool calls and managed-model tokens. These are useful examples of why cost ownership and the billing unit need explicit validation.

## Segment hypotheses to test

These are our judgments, not customer statements.

| Workload | Why it might fit | Most useful objection to uncover |
|---|---|---|
| Support and operational agents | Similar intents recur, often with fresh account/order data. | Procedures are already scripted or current model costs are too small. |
| Job applications, forms and catalog enrichment | Repeated structures with changing inputs; outputs can often be checked. | Existing parsers/scripts already remove reasoning; maintenance dominates. |
| Shopping and travel | Repeated search, filtering and booking steps across many users. | Fresh availability and personalized choices require most of the model work. |
| QA/testing agents | Similar setups and journeys recur as software changes. | Test generation already compiles to code; new changes require fresh exploration. |
| Consumer assistants and scheduling | Daily briefings, coordination and recurring cross-app tasks. | Work varies too much by user; small savings fail to justify integration. |
| Tutoring and research | High usage and repeated task structure. | New explanations, speech generation or novel reasoning dominate cost. |
| Coding harnesses | Large inference throughput and repeated tool scaffolding. | The end user pays the bill; throughput is not the vendor's own expense. |

## Quick conversation at Hogpatch

Start with past behavior: “Tell me about the last time you tried to reduce agent costs. What task was expensive, what did you change, and what happened?” Then establish approximate frequency, cost per successful task, failure/retry cost, and who owns the bill. An answer that costs are insignificant or already solved is useful evidence.

If the pain is concrete, the next useful commitment is permission to evaluate one recurring workflow using a small sanitized trace sample and its success criterion. Ask who can supply that sample and when. A pilot with an owner and a date is stronger evidence than general enthusiasm. Do not claim willingness to share until someone actually agrees.

## Which conversations to prioritize

This is a research priority, not a claim that these companies want the product.

1. **Lindy and Twin:** strongest published evidence of active inference-cost optimization. Ask what remains expensive after their model changes.
2. **Tsenta, Anglera and Fini:** concrete repeated operations with changing inputs. Ask which steps already run as ordinary code and which still consume expensive reasoning.
3. **Julius and Skyvern:** useful challenges to the thesis. Julius simplified away workflow scaffolding; Skyvern already offers code caching. Find the incremental problem before pitching a solution.
4. **Pingo, Retell and Duckbill:** test whether speech, novel responses or human execution dominate the economics.
5. **Jcode and infrastructure providers:** establish who owns the bill and purchasing decision. Large inference throughput does not automatically identify a buyer.

Before discussing a savings percentage, identify the actual billing unit: tokens, calls, minutes, credits or a fixed subscription. Fewer model calls do not necessarily reduce a bill priced per minute or per completed job. Separate the application operator's cost from its customer's price.

## What has and has not been established

| Question | Current evidence |
|---|---|
| Do agent companies spend engineering effort on inference economics? | Supported by published engineering accounts from Lindy and Twin; not independently audited. |
| Are there recurring tasks across several customer segments? | Supported by public product descriptions and examples; individual production traces have not been inspected. |
| Is automatic reuse technically plausible? | Supported by research, competing product capabilities and the preliminary saved prototype outputs audited in the linked claims document. No new end-to-end execution was run in this validation pass. |
| Are existing model changes, scripts and caches insufficient? | Not established. Julius, Skyvern, Gumloop and Pally make this an essential interview question. |
| Will a specific customer adopt or pay for our product? | Not established. No pilot or LOI has been obtained. |
| Does our approach save money at the customer's required quality? | Not established. The matched mock-store replay shows lower estimated inference cost, but no customer workload or matched outcome-quality evaluation was run. |

The short response window and Sunday outreach mean silence is not evidence that the problem is unimportant. Conversely, an acknowledgment, a public product claim or a sent email is not an expression of demand.

## What a convincing pilot must establish

1. Pick a recurring intent and a held-out set with changed parameters and current data.
2. Compare against the customer's current optimized baseline, including cheaper models and existing caching.
3. Measure completed, correct outcomes; include failure, escalation and fallback cases.
4. Measure ongoing serving cost, including agent inference, normalization, memory calls, retries and fallback. Use the shared model; no per-customer training is required.
5. Report inference savings at an agreed quality threshold. Fewer model calls alone do not establish savings.

No product changes, customer-data imports, paid commitments or LOIs were made in this validation pass.

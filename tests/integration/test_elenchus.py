from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


def test_propose_and_refute_dialectic():
    # Deploy the Elenchus contract
    factory = get_contract_factory("Elenchus")
    contract = factory.deploy(args=[])

    # 1. Propose a hypothesis with topic, category, claim, and evidence URL
    rc = contract.propose_hypothesis(
        args=[
            "Artificial General Intelligence Timelines",
            "Technology",
            "Human-level artificial general intelligence will be achieved and deployed before 2032.",
            "https://example.com/agi-timeline-analysis-2026"
        ]
    ).transact()
    assert tx_execution_succeeded(rc)

    # 2. Query dialectics listing to ensure it was created correctly
    dialectics = contract.get_arenas(args=[0]).call()
    assert len(dialectics) == 1
    
    dialectic = dialectics[0]
    assert dialectic["topic"] == "Artificial General Intelligence Timelines"
    assert dialectic["category"] == "Technology"
    assert dialectic["claim"] == "Human-level artificial general intelligence will be achieved and deployed before 2032."
    assert dialectic["evidence_url"] == "https://example.com/agi-timeline-analysis-2026"
    assert int(dialectic["progression_index"]) == 1

    dialectic_id = dialectic["id"]

    # 3. Refute the hypothesis with a contender claim and new web evidence URL
    rc2 = contract.refute_hypothesis(
        args=[
            dialectic_id,
            "Hardware and algorithmic constraints will delay human-level AGI until at least 2045.",
            "https://example.com/agi-bottlenecks-study"
        ]
    ).transact()
    assert tx_execution_succeeded(rc2)

    # 4. Check the updated dialectic detail to ensure the challenge was registered
    dialectic_updated = contract.get_arena(args=[dialectic_id]).call()
    assert int(dialectic_updated["clashes"]) == 1
    assert dialectic_updated["claim"] in (
        "Human-level artificial general intelligence will be achieved and deployed before 2032.",
        "Hardware and algorithmic constraints will delay human-level AGI until at least 2045."
    )

    # 5. Query global stats and verify
    stats = contract.get_stats(args=[]).call()
    assert int(stats["debates"]) == 1

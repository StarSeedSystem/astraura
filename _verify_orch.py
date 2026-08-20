import re, os
src_root = "/Users/alex/Documents/IA 1.58 bit/backend/app"
checks = {
  "personality_engine.get_all_profiles": ("personalities/personality_engine.py", r"def get_all_profiles\("),
  "personality_engine.active_personality_id": ("personalities/personality_engine.py", r"active_personality_id"),
  "starseed_memory_engine.add_memory_node dict": ("memory/starseed_memory_engine.py", r"def add_memory_node\(self, node_data"),
  "cerebros_manager.get_cerebros": ("cerebros/cerebros_manager.py", r"def get_cerebros\("),
  "swarm_manager.dispatch_task": ("agents/swarm_manager.py", r"def dispatch_task\("),
  "intuitive.grant_and_apply_request": ("core/intuitive_imagination_engine.py", r"def grant_and_apply_request\("),
  "intuitive.run_automated_execution_workflow": ("core/intuitive_imagination_engine.py", r"def run_automated_execution_workflow\("),
  "notifications.apply_notification": ("core/system_notifications_engine.py", r"def apply_notification\("),
  "storage.scan_and_execute_rules": ("core/storage_routing_engine.py", r"def scan_and_execute_rules\("),
}
for label,(rel,pat) in checks.items():
    p = os.path.join(src_root, rel)
    txt = open(p, encoding='utf-8').read()
    ok = re.search(pat, txt) is not None
    print(("FOUND   " if ok else "MISSING ")+label)

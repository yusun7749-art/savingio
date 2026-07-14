from collections import deque
class MessageBus:
    def __init__(self): self.q=deque()
    def send(self,src,dst,payload): self.q.append({"from":src,"to":dst,"payload":payload})
    def receive(self,dst):
        out=[]; keep=deque()
        while self.q:
            m=self.q.popleft();
            (out if m["to"]==dst else keep).append(m) if False else None
        # rebuild

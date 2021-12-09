#Analyse des relations

import networkx as nx
from networkx import shortest_path

class SocialGraph:

    def __init__(self):
        self.G = nx.Graph()
        self.edge_prop=[]


    def filter(self,critere="pagerank",threshold=0):
        _G=self.G.copy()
        for idx in self.G.nodes:
            if not critere in self.G.nodes[idx] or self.G.nodes[idx][critere]<threshold:
                _G.remove_node(idx)
        self.G=_G


    def extract_subgraph(self):
        res=shortest_path(self.G)

    def load(self,transactions,miners,dealers,contract):
        ids=[]

        items=[]
        for t in transactions:
            if RESULT_SECTION in t:
                for r in t[RESULT_SECTION]:
                    items.append({"sender":t["sender"],"receiver":r["receiver"],"function":t["function"],"value":t["value"],"timestamp":t["timestamp"]})

        for t in items:
            for p in [t["sender"],t["receiver"]]:
                if p not in ids:
                    visual="./assets/icons/person.png"
                    if p in miners:visual="./assets/icons/miner.png"
                    if p in dealers:visual="./assets/icons/miner.png"
                    if p in contract:visual="./assets/icons/factory.png"
                    self.G.add_node(p,
                                    visual=visual,
                                    label=p
                                    )

                ids.append(p)

            self.G.add_edge(t["sender"],t["receiver"],
                            ts=t["timestamp"],
                            value=t["value"],
                            action=t["function"])


        return len(self.G.nodes)



    def eval(self,critere="pagerank"):
        if "pagerank" in critere:
            ranks=nx.pagerank(self.G)
            for k in ranks.keys():
                self.G.nodes[k]["pagerank"]=ranks.get(k)

        if "centrality" in critere:
            props=nx.betweenness_centrality(self.G)
            for k in props.keys():
                self.G.nodes[k]["centrality"]=props.get(k)


    #http://localhost:8000/api/social_graph/
    def export(self,format="graphml"):
        if format=="gxf":
            filename="./static/test.gefx"
            nx.write_gexf(self.G, filename,encoding="utf-8")

        if format=="graphml":
            filename="./static/femis.graphml"
            nx.write_graphml(self.G,filename,encoding="utf-8")

        if format=="json":
            nodes_with_attr = list()
            for n in self.G.nodes.data():
                n[1]["id"]=n[0]
                nodes_with_attr.append(n[1])

            edges=[]
            for edge in list(self.G.edges.data()):
                edges.append({
                    "source":edge[0],
                    "target":edge[1],
                    "data":edge[2]
                })

            rc={"graph":{"nodes":nodes_with_attr,"edges":edges},"edge_props":self.edge_prop}
            return rc

        return filename





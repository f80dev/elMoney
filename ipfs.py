import base64
import json
import os
from datetime import datetime
from os import remove

import requests
from ipfsApi import Client, multipart
from werkzeug.datastructures import FileStorage

from Tools import log


class IPFS:
    client=None

    def __init__(self, addr:str,port:int):
        self.client=Client(addr,port)
        log("Adresse du client IPFS: " + addr)

    def add_file(self, file):
        cid=self.client.add(file)
        log("Enregistrement du fichier "+cid["Hash"]+" sur IPFS")
        return cid["Hash"]

    def add(self,body:str):
        if type(body)==str:
            if body.startswith("data:"):
                data=base64.b64decode(body.split("base64,")[1])
            else:
                data=bytes(body,"utf8")

            filename="./temp/image"+hex(int(datetime.now().timestamp()*1000))+".jpg"
            with open(filename,"wb") as f: f.write(data)
            f.close()

            cids=self.client.add(filename)
            cid=cids[0]["Hash"]

            os.remove(filename)


        log("Enregistrement du fichier https://ipfs.io/ipfs/" + cid + " sur IPFS")
        return cid



    def get_dict(self,token):
        if len(token)!=46: return token
        url="https://ipfs.io/ipfs/"+token
        r=requests.get(url)
        try:
            return json.loads(r.text.replace("'","\""))
        except:
            return r

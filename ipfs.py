import base64
import json
import os
from datetime import datetime

import requests

class IPFS:
    addr=None

    def __init__(self, addr:str):
        self.addr=addr

    def add(self,body):
        url=self.addr+"/api/v0/add/"

        filename=str(datetime.now().timestamp())+".tmp"

        f=open('./temp/'+filename, 'wb')
        if type(body)==str:
            if str(body).startswith("base64,"):
                f.write(base64.b64decode(body.split("base64,")[1]))
            else:
                f.write(bytes(body.replace("'","\""),"utf8"))
        else:
            f.write(bytes(body,"utf8"))

        f.close()

        f = open('./temp/' + filename, 'rb')
        r = requests.post(url,files={'files': f})
        f.close()

        os.remove("./temp/"+filename)
        result=r.json()

        return result["Hash"]



    def get_dict(self,token):
        if len(token)!=46: return token
        url="https://ipfs.io/ipfs/"+token
        r=requests.get(url).content
        try:
            return json.loads(str(r,"utf8").replace("'","\""))
        except:
            return r


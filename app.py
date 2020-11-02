import base64
import os
import ssl
import sys

from flask import Flask, Response, request, jsonify
from flask_cors import CORS

from elrondTools import ElrondNet

app = Flask(__name__)
CORS(app)
bc=ElrondNet(contract_addr="erd1qqqqqqqqqqqqqpgq6v5n4lrjqrsdtkv6jzcrmxvet3r55tj49e3sk2ctas")


#test http://localhost:5000/api/transfer
@app.route('/api/transfer/<dest>/<amount>/',methods=["POST"])
def transfer(dest:str,amount:str):
    pem_body=str(base64.b64decode(str(request.data).split("base64,")[1]),encoding="utf-8")
    with open("./PEM/temp.pem", "w") as pem_file:pem_file.write(pem_body)

    _from_addr=bc.transfer("./PEM/temp.pem",dest,int(amount))

    os.remove("./PEM/temp.pem")

    return jsonify({"from_addr":str(_from_addr.bech32())})





#test http://localhost:5000/api/balance/erd1spyavw0956vq68xj8y4tenjpq2wd5a9p2c6j8gsz7ztyrnpxrruqzu66jx/
@app.route('/api/balance/<addr>/')
def getbalance(addr:str):
    rc = bc.getBalance(addr)
    return Response(str(rc), 200)






if __name__ == '__main__':
    _port=5000
    if len(sys.argv)>2:
        _port = sys.argv[1]

    if "debug" in sys.argv:
        app.run(host="0.0.0.0", port=_port, debug=True)
    else:
        if "ssl" in sys.argv:
            context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
            context.load_cert_chain("/app/certs/fullchain.pem", "/app/certs/privkey.pem")
            app.run(host="0.0.0.0", port=_port, debug=False, ssl_context=context)
        else:
            app.run(host="0.0.0.0", port=_port, debug=False)



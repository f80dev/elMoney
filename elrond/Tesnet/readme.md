#Prepration du serveur
<pre>
firewall-cmd --add-port=37373
firewall-cmd --add-port=7950
</pre>

#Lancement
<pre>
docker rm -f elrond-testnet-node
docker run --name elrond-testnet-node --mount type=bind,source=/root/elrond/,destination=/root/elrond -d elrondnetwork/elrond-go-node-testnet:T1.2.19.0 --validator-key-pem-file=/root/elrond/validatorKey.pem
</pre>


#References
- Installer via Docker :  https://docs.elrond.com/validators/testnet/use-docker-testnet/


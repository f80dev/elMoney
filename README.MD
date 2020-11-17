#Principe
Le principe de CoinMaker est de simplifier la création de monnaies sur la base d'ERC20
Il s'agit d'un projet expérimental donc l'objectif premier est de se familliariser 
avec différents concepts de l'environnement
de développement d'Elrond, à savoir :
 - l'écriture de SmartContract en RUST
 - le déploiement de ce contrat via la librairie Python ERDPY
 - la communication entre un serveur python (Flask) et le contrat déployé
 - la création de compte et la gestion des clés depuis le serveur


#Architecture
L'architecture de la solution repose sur 
- une base de données MongoDB pour stocker la liste des monnaies disponible)
- un serveur REST dialoguant avec le front end, la blocchaine et la base de données. Hébergé
- un client web développé sur Angular, compatible avec tout type de terminaux



#Mise en oeuvre
##Lancement du serveur principal
Le serveur CoinMaker est hébergé dans un container Docker. Il peut être exécuté sur n'importe quel serveur linux compatible


Il peut se connecter à différente blocchaine suivant l'adresse indiquer au proxy erdpy :
- Testnet : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "https://api-testnet.elrond.com" ssl</pre>

- Testnet local : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "http://161.97.75.165:7950" ssl</pre>

- MainNet : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "https://api.elrond.com" ssl</pre>




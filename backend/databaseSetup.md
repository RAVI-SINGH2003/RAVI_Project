
# DATABASE Setup

## MySQL Workbench setup for database
1. Install MySQL WorkBench and do the necessary setup as mentioned on https://linuxhint.com/installing_mysql_workbench_ubuntu/.
2. Create a database schema 'ravi_webapp' and two tables 'User' and 'doc_upload' by running the following queries :

```sql
CREATE DATABASE  IF NOT EXISTS `ravi_webapp` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `ravi_webapp`;
```
```sql
DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `autoid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(45) NOT NULL,
  `password` varchar(60) NOT NULL,
  `isactive` bit(1) NOT NULL DEFAULT b'1',
  `last_login` datetime DEFAULT NULL,
  `usertype` int DEFAULT NULL,
  PRIMARY KEY (`autoid`),
  UNIQUE KEY `autoid_UNIQUE` (`autoid`),
  UNIQUE KEY `username_UNIQUE` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```
```sql
DROP TABLE IF EXISTS `doc_upload`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doc_upload` (
  `autoid` int NOT NULL AUTO_INCREMENT,
  `originalPdf` varchar(100) DEFAULT NULL,
  `modifiedHtml` varchar(100) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `userid` int DEFAULT NULL,
  `uploaddate` datetime DEFAULT NULL,
  `modifieddate` datetime DEFAULT NULL,
  `originalHtml` varchar(100) DEFAULT NULL,
  `basePath` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`autoid`),
  UNIQUE KEY `autoid_UNIQUE` (`autoid`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

3. Change the password accordingly in 'server.js'.


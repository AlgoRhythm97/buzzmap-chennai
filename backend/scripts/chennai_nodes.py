"""
Demo sensing nodes across Chennai. Coordinates are approximate neighbourhood centres.
`species_weights` sets each site's simulated insect mix (relative, need not sum to 1).
"""
CHENNAI_NODES = [
    {"id": "CHN-ADYAR-01", "name": "Adyar Riverside", "locality": "Adyar",
     "latitude": 13.0012, "longitude": 80.2565,
     "species_weights": {"AEDES": 3, "CULEX": 4, "ANOPHELES": 1, "NON_MOSQUITO": 2}},
    {"id": "CHN-TNAGAR-01", "name": "T. Nagar Market", "locality": "T. Nagar",
     "latitude": 13.0418, "longitude": 80.2341,
     "species_weights": {"AEDES": 5, "CULEX": 2, "ANOPHELES": 1, "NON_MOSQUITO": 3}},
    {"id": "CHN-VELACHERY-01", "name": "Velachery Lake", "locality": "Velachery",
     "latitude": 12.9815, "longitude": 80.2180,
     "species_weights": {"AEDES": 2, "CULEX": 5, "ANOPHELES": 2, "NON_MOSQUITO": 1}},
    {"id": "CHN-ANNANAGAR-01", "name": "Anna Nagar Tower Park", "locality": "Anna Nagar",
     "latitude": 13.0850, "longitude": 80.2101,
     "species_weights": {"AEDES": 4, "CULEX": 2, "ANOPHELES": 1, "NON_MOSQUITO": 2}},
    {"id": "CHN-MYLAPORE-01", "name": "Mylapore Tank", "locality": "Mylapore",
     "latitude": 13.0368, "longitude": 80.2676,
     "species_weights": {"AEDES": 4, "CULEX": 3, "ANOPHELES": 1, "NON_MOSQUITO": 2}},
    {"id": "CHN-TAMBARAM-01", "name": "Tambaram Rail Yard", "locality": "Tambaram",
     "latitude": 12.9249, "longitude": 80.1000,
     "species_weights": {"AEDES": 2, "CULEX": 3, "ANOPHELES": 3, "NON_MOSQUITO": 2}},
    {"id": "CHN-PERAMBUR-01", "name": "Perambur Canal", "locality": "Perambur",
     "latitude": 13.1143, "longitude": 80.2329,
     "species_weights": {"AEDES": 2, "CULEX": 5, "ANOPHELES": 2, "NON_MOSQUITO": 1}},
    {"id": "CHN-PORUR-01", "name": "Porur Lake", "locality": "Porur",
     "latitude": 13.0382, "longitude": 80.1565,
     "species_weights": {"AEDES": 2, "CULEX": 3, "ANOPHELES": 3, "NON_MOSQUITO": 2}},
    {"id": "CHN-SHOLINGANALLUR-01", "name": "Sholinganallur Marsh", "locality": "Sholinganallur",
     "latitude": 12.9010, "longitude": 80.2279,
     "species_weights": {"AEDES": 2, "CULEX": 4, "ANOPHELES": 3, "NON_MOSQUITO": 1}},
]

def node_registration(node: dict) -> dict:
    """The node fields accepted by /api/nodes (drops simulation-only keys)."""
    return {k: v for k, v in node.items() if k != "species_weights"}

def pick_species(node: dict, rng, count: int = 1) -> list:
    """Draws species for a node according to its simulated insect mix."""
    species = list(node["species_weights"])
    weights = [node["species_weights"][s] for s in species]
    probabilities = [w / sum(weights) for w in weights]
    return [str(s) for s in rng.choice(species, size=count, p=probabilities)]

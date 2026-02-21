import pandas as pd

from api.processing.transforms import normalize_headers, normalize_values


def test_normalize_headers():
    df = pd.DataFrame({" First Name ": [1, 2], "Last Name": [3, 4]})

    df_clean, log = normalize_headers(df)

    assert list(df_clean.columns) == ["first_name", "last_name"]
    assert log["action"] == "normalize_headers"


def test_normalize_values():
    df = pd.DataFrame({"name": [" Alice ", "Bob  ", "Charlie"], "age": [25, 30, 35]})

    df_clean, log = normalize_values(df)

    assert df_clean["name"].tolist() == ["Alice", "Bob", "Charlie"]
    assert df_clean["age"].tolist() == [25, 30, 35]
    assert log["action"] == "normalize_values"

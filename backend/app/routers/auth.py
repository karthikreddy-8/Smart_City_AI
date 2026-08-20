from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])



@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""

    # Reject blank fields
    if not user_data.username or not user_data.username.strip():
        raise HTTPException(status_code=422, detail="Username cannot be empty.")
    if not user_data.password or len(user_data.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    # Validate role
    valid_roles = {"Admin", "Traffic Analyst", "Guest"}
    role = user_data.role if user_data.role in valid_roles else "Guest"

    # Duplicate email check
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please use a different email or sign in."
        )

    # Duplicate username check
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken. Please choose a different username."
        )

    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_pwd,
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login endpoint — accepts username OR email in the 'username' field.
    Returns a JWT token with the user's role embedded.
    """
    identifier = (form_data.username or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username or email is required."
        )

    # Look up by username first (case-insensitive), then by email (case-insensitive)
    user = db.query(User).filter(func.lower(User.username) == identifier.lower()).first()
    if not user:
        user = db.query(User).filter(func.lower(User.email) == identifier.lower()).first()

    # Generic error — do NOT reveal whether username or password was wrong
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username/email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
def logout():
    """Stateless JWT — logout is handled client-side by discarding the token."""
    return {"message": "Logged out successfully. Please discard your token."}

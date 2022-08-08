import User from "../models/User";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import Video from "../models/Video";

export const getJoin = (req, res) => res.render("join", {
    pageTitle: "Join",
});

export const postJoin = async (req, res) => {
    const { name,
        email,
        username,
        password,
        password2,
        location } = req.body;
    const pageTitle = "Join"
    if (password != password2) {
        return res.status(404).render("join", {
            pageTitle,
            errorMessage: "Password confirmation does not match",
        });
    }
    const exists = await User.exists({ $or: [{ username }, { email }] });
    if (exists) {
        return res.status(404).render("join", {
            pageTitle,
            errorMessage: "This username/email is alreay used",
        });
    }
    try {
        console.log(name, email, username, password, location);
        await User.create({
            name: name,
            email,
            username,
            password,
            location,
        });
        res.redirect("/login");
    } catch (error) {
        return res.status(404).render("join", {
            pageTitle: "Join",
            errorMessage: error._message,
        });
    }
};

export const getLogin = (req, res) => res.render("login", {
    pageTitle: "Login",
});

export const postLogin = async (req, res) => {
    const { username, password } = req.body;
    const pageTitle = "Login"
    const user = await User.findOne({
        username,
        socialOnly: false,
    });
    if (!user) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "An account with this username doesn't exists",
        });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "Wrong password",
        });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    res.redirect("/");
}

export const startGithubLogin = (req, res) => {
    const baseURL = `https://github.com/login/oauth/authorize`;
    const config = {
        client_id: process.env.GH_CLIENT_ID,
        allow_signup: false,
        scope: "read:user user:email",
    };
    const params = new URLSearchParams(config).toString();
    const finalURL = `${baseURL}?${params}`;
    return res.redirect(finalURL);
};

export const finishGithubLogin = async (req, res) => {
    const baseURL = "https://github.com/login/oauth/access_token";
    const config = {
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_SECRET,
        code: req.query.code,
    };
    const params = new URLSearchParams(config).toString();
    const finalURL = `${baseURL}?${params}`;
    const tokenRequest = await (await fetch(finalURL, {
        method: "POST",
        headers: {
            Accept: "application/json",
        },
    })).json();
    if ("access_token" in tokenRequest) {
        const { access_token } = tokenRequest;
        const apiURL = "https://api.github.com";
        const userData = await (await fetch(`${apiURL}/user`, {
            headers: {
                Authorization: `token ${access_token}`,
            },
        })).json();
        const emailData = await (await fetch(`${apiURL}/user/emails`, {
            headers: {
                Authorization: `token ${access_token}`,
            },
        })).json();
        const emailObj = emailData.find(
            (email) => email.primary === true && email.verified === true
        );
        if (!emailObj) {
            return res.redirect("/login");
        }
        let user = await User.findOne({ email: emailObj.email });
        if (!user) {
            await User.create({
                avatarUrl: userData.avatar_url,
                name: userData.login,
                email: emailObj.email,
                username: userData.login,
                password: "",
                socialOnly: true,
                location: userData.location,
            });
            req.session.loggedIn = true;
            req.session.user = user;
            res.redirect("/");
        } else {
            req.session.loggedIn = true;
            req.session.user = user;
            return res.redirect("/");
        }
    } else {
        return res.redirect("/login");
    }
};

export const startKakaoLogin = (req, res) => {
    const baseURL = `https://kauth.kakao.com/oauth/authorize`;
    const config = {
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: "http://localhost:4000/users/kakao/finish",
        response_type: "code",
    };
    const params = new URLSearchParams(config).toString();
    const finalURL = `${baseURL}?${params}`;
    return res.redirect(finalURL);
};

export const finishKakaoLogin = async (req, res) => {
    const baseURL = `https://kauth.kakao.com/oauth/token`;
    const config = {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: "http://localhost:4000/users/kakao/finish",
        code: req.query.code,
    };
    const params = new URLSearchParams(config).toString();
    const finalURL = `${baseURL}?${params}`;
    const tokenRequest = await (await fetch(finalURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
    })).json();
    if ("access_token" in tokenRequest) {
        const { access_token } = tokenRequest;
        const userData = await (await fetch("https://kapi.kakao.com/v2/user/me", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "property_keys": ["kakao_account.email"],
            },
        })).json();
        const kakao_email = userData.kakao_account.email;
        let user = await User.find({ $or: [{ username: kakao_email }, { email: kakao_email }] });
        if (!user) {
            await User.create({
                name: userData.kakao_account.profile.nickname,
                email: userData.kakao_account.email,
                username: userData.kakao_account.email,
                password: "",
                socialOnly: true,
            });
            req.session.loggedIn = true;
            req.session.user = user;
            res.redirect("/");
        } else {
            req.session.loggedIn = true;
            req.session.user = user;
            res.redirect("/");
        }
    }
};

export const logout = (req, res) => {
    req.session.destroy();
    res.redirect("/");
};

export const getEdit = (req, res) => {
    return res.render("edit-profile", {
        pageTitle: "Edit Profile",
    });
}

export const postEdit = async (req, res) => {
    const {
        session: {
            user: { _id, avatarUrl },
        },
        body: {
            name, email, username, location
        },
        file,
    } = req;
    const updatedUser = await User.findByIdAndUpdate(_id, {
        avatarUrl: file ? file.path : avatarUrl,
        name,
        email,
        username,
        location,
    }, { new: true });
    req.session.user = updatedUser;
    return res.redirect("edit");
}

export const getChangePassword = (req, res) => {
    return res.render("users/change-password", {
        pageTitle: "Change Password",
    });
};

export const postChangePassword = async (req, res) => {
    const {
        session: {
            user: { _id, password },
        },
        body: {
            oldPassword,
            newPassword,
            Confirmation,
        },
    } = req;
    const ok = await bcrypt.compare(oldPassword, password);
    if (!ok) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "The current password is incorrect",
        });
    }

    if (newPassword !== Confirmation) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "password does not match the confirmation"
        });
    }
    const user = await User.findById(_id);
    user.password = newPassword;
    await user.save();
    req.session.user.password = user.password;
    return res.redirect("/users/logout");
};

export const see = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id).populate("videos");
        return res.render("users/profile", {
            pageTitle: user.name,
            user,
        });
    } catch (error) {
        return res.status(404).render("404", {
            pageTitle: "User not found.",
        });
    }
}